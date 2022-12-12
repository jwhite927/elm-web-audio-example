## Context
Intended as a working example of how to bundle together the code in [hayleigh-dot-dev/elm-web-audio](https://package.elm-lang.org/packages/hayleigh-dot-dev/elm-web-audio/latest/) with ports.

The glue code in [elm-web-audio.js](src/js/elm-web-audio.js) was drawn from [hayleigh's elm-web-audio repo](https://github.com/hayleigh-dot-dev/elm-web-audio/blob/38d7fcdd64baa489b2f844394e7d678132a7b0ce/src/elm-web-audio.js).

I removed the code comments for brevity, so if you are trying to hack on the glue code and need more information, please refer to the original.

## Build

```
npm install
npm start
```

When clicking the text, you should hear a tone play through the browser tab.

See the deployed example [live here](https://elm-web-audio-example.netlify.app/).
