# 4chan GhostPostMixer

Interleave deleted posts and ghost posts from the archives into live 4chan threads

## Why?

- Have you ever wondered what posts a jannie deleted in a thread?
- Have you ever written a reply only to find out you've been banned?
- Have you ever had a jannie delete every post you made after banning you?

This userscript can help you and the rest of the 4chan community in these situations.  The more people use it, the more useful it will become, because the power of the jannie to silence people will be reduced with every installation.

Installing this userscript is more effective than posting "FUCK JANNIES!"

## Installation

- Get a userscript manager (if you don't already have one).
  + Major desktop browsers can install [Violentmonkey](https://violentmonkey.github.io/) or [Tampermonkey](https://www.tampermonkey.net/).
  + iOS users can install [Userscripts for Safari](https://apps.apple.com/us/app/userscripts/id1463298887).
  + Android users can install [Kiwi Browser](https://kiwibrowser.com/) and then install [Violentmonkey](https://violentmonkey.github.io/) or [Tampermonkey](https://www.tampermonkey.net/).
- Click the following link to [Install 4chan GhostPostMixer](https://git.coom.tech/gg1234/4chan-ghostpostmixer/raw/branch/master/4chan-ghostpostmixer.user.js)

## Development

- The official repository is at https://git.coom.tech/gg1234/4chan-ghostpostmixer .
  + Issues and pull requests may be submitted to git.coom.tech.
- A mirror has also been setup at https://github.com/g-gundam/4chan-ghostpostmixer .

  + The mirror exists so that it's easy to post links to this userscript without getting autobanned.
  + In case you're wondering why, see [this thread](https://endchan.net/cumg/res/69.html).
  
You can also post a message at [2chen](https://2chen.moe/tech/1353679) to get somebody's attention.

## Log

### [2022-04-26] Made to work with native extension's ThreadUpdater

### [2022-04-18] Big assist from /x/+/an/ anon

### [2022-04-14] Why aren't you ghostposting?

This is the thread that started it all:  [>>>/g/86482161](https://desuarchive.org/g/thread/86482161/).  Then [>>>/g/86484192](https://desuarchive.org/g/thread/86482161/#q86484192) put out the intention.

> I would really like a userscript that places ghost replies into threads while viewing them on 4chan/nel, which works with 4chan X. It should place and keep deleted replies on refresh as well (with 4chan X if you had the thread open, but refresh, already loaded deleted replies will disappear). And of course there should be some way to differentiate them from normal, live posts.

Then the work began:  https://gist.github.com/g-gundam/8f9985e6aaa0dab6eecc556ddcbca370
