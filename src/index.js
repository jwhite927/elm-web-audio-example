'use strict';

require('./index.html');
const Elm = require('./elm/Main.elm').Elm;
import { VirtualAudioContext } from './js/elm-web-audio.js';

const ctx = new AudioContext();
const virtualCtx = new VirtualAudioContext(ctx, { autostart: true });
var app;
var isInitialized = false;

init();
function init() {
    if (isInitialized) {
        return;
    }
    app = Elm.Main.init({
        node: document.getElementById('elm-main'),
    });
    app.ports.toWebAudio.subscribe((nodes) => {
        virtualCtx.update(nodes);
    });
    isInitialized = true;
}
