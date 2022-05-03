// ==UserScript==
// @name        4chan GhostPostMixer
// @namespace   Violentmonkey Scripts
// @match       https://boards.4channel.org/*/thread/*
// @match       https://boards.4chan.org/*/thread/*
// @version     1.3.1
// @author      anon && a random husky connoisseur from /an/
// @grant       GM_xmlhttpRequest
// @grant       GM.xmlHttpRequest
// @description Interleave ghost posts from the archives into 4chan threads.  This is a prototype.
// @noframes
// ==/UserScript==

// Based on https://gist.github.com/g-gundam/8f9985e6aaa0dab6eecc556ddcbca370

// templates
const template = dedent(`<div class="postContainer replyContainer {{postClass}}" id="pc{{postId}}">
<div class="sideArrows" id="sa{{postId}}">&gt;&gt;</div>
<div id="p{{postId}}" class="post reply {{replyClass}}">
	<div class="postInfoM mobile" id="pim{{postId}}">
		<span class="nameBlock"><span class="name">{{authorName}}</span><br /></span>
		<span class="dateTime postNum" data-utc="unixTime">{{formattedDate}}&nbsp;<a href="#p{{postId}}" title="Link to this post">No.</a><a href="javascript:quote('{{postId}}');" title="Reply to this post">{{postId}}</a></span>
	</div>
	<div class="postInfo desktop" id="pi{{postId}}">
		<span class="nameBlock"><span class="name">{{authorName}}</span> </span> {{timeHtml}}&nbsp;
		<span class="postNum desktop"><a href="#p{{postId}}" title="Link to this post">No.</a><a href="javascript:quote('{{postId}}');" title="Reply to this post">{{postId}}</a></span>
	</div>
	{{fileBlock}}
	<blockquote class="postMessage" id="m{{postId}}">{{contentHtml}}</blockquote>
</div>
</div>`);

const fileTemplate = dedent(`<div class="file" id="f{{postId}}">
<div class="fileText" id="fT{{postId}}">File: <a title="{{fileName}}" href="{{fileUrl}}" target="_blank">{{fileNameShort}}</a> ({{fileMeta}})</div>
<a class="fileThumb" href="{{fileUrl}}" target="_blank">
	<img src="{{fileThumbUrl}}" style="height: {{filePreviewheight}}px; width: {{filePreviewWidth}}px;" data-md5="{{fileMd5}}" loading="lazy"/>
	<div data-tip="" data-tip-cb="mShowFull" class="mFileInfo mobile">{{fileMeta}}</div>
</a>
</div>`);

const backLinkTemplate = dedent(`<a href="#p{{postId}}" class="quotelink" data-function="highlight" data-backlink="true" data-board="an" data-post="{{postId}}">&gt;&gt;{{postId}}</a>`);

// consts
const apis = turnObjectInsideOut({
	"desuarchive.org": ["a", "aco", "an", "c", "cgl", "co", "d", "fit", "g", "gif", "his", "int", "k", "m", "mlp", "mu", "q", "qa", "r9k", "tg", "trash", "vr", "wsg"],
	"archive.4plebs.org": ["adv", "f", "hr", "mlpol", "mo", "o", "pol", "s4s", "sp", "trv", "tv", "x"],
	"archived.moe": ["3", "asp", "b", "bant", "biz", "can", "ck", "cm", "cock", "con", "diy", "e", "fa", "fap", "fitlit", "gd", "h", "hc", "hm", "i", "ic", "jp", "lgbt", "lit", "mtv", "n", "news", "out", "outsoc", "p", "po", "pw", "qb", "qst", "r", "s", "sci", "soc", "spa", "t", "toy", "u", "v", "vg", "vint", "vip", "vmg", "vp", "vrpg", "vt", "w", "wg", "wsr", "xs", "y"]
});

let lastModified = 0;

// utils
// https://gist.github.com/GitHub30/59e002a5f57a4df0decbd7ac23290f77
async function get(url, headers) {
	return new Promise((resolve) => {
		GM.xmlHttpRequest({
			method: "GET",
			url,
			headers,
			onload: resolve,
		});
	});
}

// this is the worst name for a function, but a friend suggested it...
function turnObjectInsideOut(obj) {
	return Object.fromEntries(Object.entries(obj).flatMap(([k, vs]) => vs.map((v) => [v, k])))
}

// remove all indentations from templates. 4chan native extension breaks if there's a text node as first child in some cases (like image expansion)
function dedent(str) {
	return str.split(/\r?\n/).map((line) => line.replace(/^\s+/g, '').trim()).filter(Boolean).join('');
}

function interpolateTemplateString(template, data) {
	if (!template) throw new Error("No template provided");
	return template.replace(/{{([^}]+)}}/g, (_, key) => data[key] ?? '');
}

function htmlToElement(html) {
	var template = document.createElement('template');
	html = html.trim(); // Never return a text node of whitespace as the result
	template.innerHTML = html;
	return template.content.firstChild;
}

function renderTemplate(template, data) {
	data = data || {};
	return htmlToElement(interpolateTemplateString(template, data));
}

// https://stackoverflow.com/questions/61774434/how-to-wait-for-element-to-load-completely-into-dom
// https://stackoverflow.com/questions/15875128/is-there-element-rendered-event
// https://stackoverflow.com/questions/220188/how-can-i-determine-if-a-dynamically-created-dom-element-has-been-added-to-the-d
function elementReady(container, element) {
	return new Promise((resolve, reject) => {
		let el = container.contains(element);
		if (el) {
			resolve(element);
			return
		}

		new MutationObserver((_, observer) => {
			if (container.contains(element)) {
				console.log('[GhostPostMixer-elementReady] observer reported element ready');
				resolve(element);
				observer.disconnect();
			}
		}).observe(container, {
			childList: true,
			subtree: true
		});
	});
}

function getFucking4chanTime(d) {
	var month = d.getMonth() + 1;
	var day = d.getDate();
	var hour = d.getHours();
	var minute = d.getMinutes();
	var second = d.getSeconds();
	var year = d.getFullYear();
	return month.toString().padStart(2, '0') + "/" + day.toString().padStart(2, '0') + "/" + year.toString().slice(-2) + "(" + ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()] + ")" + hour.toString().padStart(2, '0') + ":" + minute.toString().padStart(2, '0') + ":" + second.toString().padStart(2, '0');
}

function humanFileSize(size) {
	size = Math.abs(size);
	const i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
	return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
};

function parsePostObject(post) {
	const postId = parseInt(post.num, 10);

	const contentText = post.comment_sanitized;
	const contentHtml = post.comment_processed.replace(/https:\/\/.*?\/\w+\/thread\/\d+\/#(\d+)\/?/gi, '#p$1').replace(/backlink/gi, 'quotelink').replace(/\n/gm, '');

	const fileObj = {};
	const file = post.media;
	if (file && Object.keys(file).length) {
		fileObj.fileName = file.media_filename;
		fileObj.fileUrl = file.media_link;
		fileObj.fileThumbUrl = file.thumb_link;
		fileObj.filePreviewWidth = file.preview_w;
		fileObj.filePreviewHeigth = file.preview_h;
		fileObj.fileSize = humanFileSize(parseInt(file.media_size, 10));
		fileObj.fileMeta = `${fileObj.fileSize}, ${file.media_w}x${file.media_h}`;
		fileObj.fileNameShort = file.media_filename_processed;
		fileObj.fileMd5 = file.media_hash;
	}

	const authorName = `${post.name} ${post.trip ?? ''}`.trim();
	const date = new Date(post.timestamp * 1000);
	const timeHtml = `<span class="dateTime" data-utc="${post.timestamp}">${getFucking4chanTime(date)}</span>`;

	return {
		postId,
		content: contentText,
		contentHtml,
		authorName,
		timeHtml,
		...fileObj
	};
}

// Create a new DOM element suitable for insertion into a 4chan thread.
function postTemplate(post, vars) {
	const data = parsePostObject(post);

	// set some conditional parameters (we could extract these from the posts but the original code does it this way)
	data.postId = vars.n ? `${vars.parentId}_${vars.n}` : vars.parentId;
	data.replyClass = vars.deleted ? 'del' : 'ghost';
	data.postClass = vars.deleted ? 'post-deleted' : 'post-ghost';

	if (data.fileUrl) {
		data.fileBlock = interpolateTemplateString(fileTemplate, data);
	}

	return renderTemplate(template, data);
}

// Go throught the entire thread and fix all dead links if we inserted a deleted posts from the archive
// This works with the built in extension
function fixBacklinks(postId) {
	const deadLinks = Array.from(document.body.querySelectorAll('.thread .deadlink')).filter(e => e.innerText == `>>${postId}`);
	for (const deadLink of deadLinks) {
		deadLink.replaceWith(renderTemplate(backLinkTemplate, { postId }));
	}
}


async function insertGhost(post, threadId) {
	const parentId = parseInt(post.num, 10);
	const n = parseInt(post.subnum, 10);
	//console.log('ag', {parentId, n})
	let parent = document.getElementById(`pc${parentId}`);

	if (parent) {
		const newPost = postTemplate(post, { parentId, n });
		parent.append(newPost);
		await elementReady(parent.parentNode, newPost);
	} else {
		console.error('Could not find parent for ghost post', post);
	}
}

async function insertDeleted(post, posts) {
	const postId = parseInt(post.num, 10);
	let i = posts.findIndex(e => e.num == post.num)
	if (i === -1) return;

	const newPost = postTemplate(post, { parentId: postId, n: 0, deleted: true });

	if (i === 0) {
		const target = document.querySelector('.opContainer');
		target.after(newPost);
		await elementReady(target.parentNode, newPost);
	} else {
		let before = posts[i - 1];
		let target;
		if (before) target = document.getElementById(`pc${before.num}`);
		if (target) {
			target.after(newPost);
			await elementReady(target.parentNode, newPost);
		}
	}

	fixBacklinks(postId);
}

function setLastModified(response) {
	try {
		const rawHeaders = response.responseHeaders;
		const headers = rawHeaders.split('\r\n').reduce((acc, line) => {
			const [key, value] = line.split(': ');
			if (!key) return acc;

			acc[key.toLowerCase()] = value;
			return acc;
		}, {});

		const lastModifiedHeader = headers['last-modified'];
		if (!lastModifiedHeader) return;

		const lastModifiedDate = new Date(lastModifiedHeader);
		if (isNaN(lastModifiedDate)) return;

		// if we call it with the same seconds as what we got from the API, it will return the entire obj... thanks cf/fooka
		lastModifiedDate.setSeconds(lastModifiedDate.getSeconds() + 1);

		lastModified = lastModifiedDate.toUTCString();
	} catch(e) {
		console.error(e);
		lastModified = 0; // reset it for safety in case of error
	}
}

async function getThread(api, board, threadId) {
	const url = `https://${api}/_/api/chan/thread/?board=${board}&num=${threadId}`;

	const headers = lastModified ? { 'if-modified-since': lastModified } : null;

	const response = await get(url, headers);

	if (response.status === 304) return console.log('[GhostPostMixer-getThread] not modified since', lastModified);

	const json = JSON.parse(response.responseText);

	if (json.error) throw new Error(json.error);

	setLastModified(response);

	return json;
}

function parseBackLinks(threadId, posts) {
	// if we have the native 4chan extension loaded and backlinks are enabled, parse the backlinks for the deleted posts
	if (unsafeWindow.Config && unsafeWindow.Config.backlinks && unsafeWindow.Parser) {
		const strThreadId = threadId.toString();
		for (const post of posts) {
			// XXX: backlinks will be out of order for now... is it worth fixing them?
			unsafeWindow.Parser.parseBacklinks(post.num, strThreadId)
		}
	}
}

function setLoader() {
	document.body.classList.add('interlacing-loader');
}

function unsetLoader() {
	document.body.classList.remove('interlacing-loader');
}

async function initThreadUpdatedPatch(api, board, threadId) {
	const TUUpdate = unsafeWindow.ThreadUpdater.update;
	unsafeWindow.ThreadUpdater.update = async function(e) {
		TUUpdate.call(this, e);

		try {
			setLoader();

			const res = await getThread(api, board, threadId, lastModified);
			if (!res?.[threadId]?.posts) return unsetLoader();

			const ghostPosts = Object.values(res[threadId].posts).filter(p => +p.subnum && !document.getElementById(`pc${p.num}_${p.subnum}`)).sort((a, b) => +a.num - +b.num || +a.subnum - +b.subnum);

			if (!ghostPosts.length) return unsetLoader();

			for (const post of ghostPosts) {
				await insertGhost(post, threadId);
			}

			console.log(`[GhostPostMixer-ThreadUpdater.update] interleaved ${ghostPosts.length} ghost posts`);
			document.body.querySelectorAll('.gm-stats-ghost').forEach(e => {e.innerText = +e.innerText + ghostPosts.length});
		} finally {
			unsetLoader();
		}
	}
}

async function init() {
	try {
		// Get thread id
		const parts = window.location.pathname.split("/");
		const threadId = parseInt(parts[3]);
		const boardId = parts[1];

		const api = apis[boardId];
		if (!api) throw new Error(`Unknown board: ${boardId}`);

		console.log('[GhostPostMixer-init] interleaving posts');
		setLoader();

		// Fetch thread from archives
		const res = await getThread(api, boardId, threadId);
		if (!res?.[threadId]?.posts) throw new Error(`No posts found for thread ${threadId}`);

		const posts = Object.values(res[threadId].posts).sort((a, b) => +a.num - +b.num || +a.subnum - +b.subnum); // this sorting may be useless, but better be safe than sorry

		const ghosts = posts.filter(p => +p.subnum);
		const deleted = posts.filter(p => p.deleted === '1');

		for (const post of deleted) {
			await insertDeleted(post, posts);
		}
		parseBackLinks(threadId, deleted);

		for (const post of ghosts) {
			await insertGhost(post, threadId);
		}

		// we patch this late on purpose, in case someone presses update before we're done.
		if (unsafeWindow.ThreadUpdater) {
			initThreadUpdatedPatch(api, boardId, threadId);
		}

		// Update the thread stats with what we interleaved
		console.log(`[GhostPostMixer-init] interleaved ${deleted.length} deleted posts and ${ghosts.length} ghost posts`);
		document.body.querySelectorAll('.thread-stats .ts-replies').forEach(e => e.insertAdjacentElement('afterend', htmlToElement(`<span class="gm-stats text-muted">&nbsp;[d: <span class="gm-stats-deleted">${deleted.length}</span>, g: <span class="gm-stats-ghost">${ghosts.length}</span>]</span>`)));
	} finally {
		unsetLoader()
	}

}

// Add CSS
const css = `
div.post.ghost {
	background-color: #ddd;
}
div.post.del {
	background-color: #eab3b3;
}

.tomorrow div.post.ghost {
	background-color: #282a88;
}
.tomorrow div.post.del {
	background-color: #882a2e;
}

.text-muted {
	color: #6c757d!important;
}

.post-ghost {
	margin-left: 2em;
}

blockquote>span.greentext {
	color: #789922;
}

body.interlacing-loader::before {
	content: '';
	position: fixed;
	bottom: 0;
	left: 0;
	border-bottom: 0.4rem solid red;
	animation: loading 2s linear infinite;
}

@keyframes loading {
	0% {
		left:0%;
		right:100%;
		width:0%;
	}
	10% {
		left:0%;
		right:75%;
		width:25%;
	}
	90% {
		right:0%;
		left:75%;
		width:25%;
	}
	100% {
		left:100%;
		right:0%;
		width:0%;
	}
}
`;

const style = document.createElement("style");
style.setAttribute('type', 'text/css')
style.appendChild(document.createTextNode(css));
document.head.appendChild(style);

init();
