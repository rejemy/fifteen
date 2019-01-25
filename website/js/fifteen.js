"use strict";
var fifteen;
(function (fifteen) {
    const BoardSize = 4;
    const ScrambleIterations = 1000;
    class FifteenGame {
        constructor() {
            this.Tiles = [];
            this.GapX = 0;
            this.GapY = 0;
            this.StartedAt = 0;
            this.TileArea = fifteen.util.assertNotNull(document.getElementById("tilearea"));
            this.cleanup();
        }
        showTitle() {
            let title = fifteen.util.assertNotNull(fifteen.ui.template("title_template"));
            this.TileArea.appendChild(title);
            let startButton = fifteen.util.assertNotNull(title.querySelector("button"));
            startButton.onclick = () => {
                fifteen.Sounds.CLICK.play();
                this.startGame();
            };
        }
        startGame() {
            fifteen.ui.removeChildren(this.TileArea);
            let num = 0;
            for (let y = 0; y < BoardSize; y++) {
                for (let x = 0; x < BoardSize; x++) {
                    if (num > 0) {
                        let newTile = new fifteen.Tile(this, num);
                        this.Tiles[x][y] = newTile;
                        newTile.setPos(x, y);
                        this.TileArea.appendChild(newTile.Element);
                    }
                    num++;
                }
            }
            this.GapX = 0;
            this.GapY = 0;
            this.scramble();
            this.StartedAt = Date.now();
        }
        scramble() {
            // Remove elements so we're not transitioning while scrambling
            for (let y = 0; y < BoardSize; y++) {
                for (let x = 0; x < BoardSize; x++) {
                    let tile = this.Tiles[x][y];
                    if (!tile)
                        continue;
                    if (tile.Element.parentElement)
                        tile.Element.remove();
                }
            }
            // Scrambling algorithm works by starting with a solvable board position,
            // then just randomly making moves. Each time, we build a list of possible
            // tiles we could pick, then we randomly pick one
            let choices = [];
            choices.length = BoardSize - 1;
            for (let iteration = 0; iteration < ScrambleIterations; iteration++) {
                let choiceX = 0;
                let choiceY = 0;
                // We first decide if we're going to move a column or row
                if (Math.random() > 0.5) {
                    let pos = 0;
                    for (let x = 0; x < BoardSize; x++) {
                        if (x != this.GapX)
                            choices[pos++] = x;
                    }
                    choiceX = choices[fifteen.util.randInt(3)];
                    choiceY = this.GapY;
                }
                else {
                    let pos = 0;
                    for (let y = 0; y < BoardSize; y++) {
                        if (y != this.GapY)
                            choices[pos++] = y;
                    }
                    choiceX = this.GapX;
                    choiceY = choices[fifteen.util.randInt(3)];
                }
                this.slideTileAt(choiceX, choiceY, true);
            }
            // Now put all the elements back at their new positions
            for (let y = 0; y < BoardSize; y++) {
                for (let x = 0; x < BoardSize; x++) {
                    let tile = this.Tiles[x][y];
                    if (!tile)
                        continue;
                    tile.setPos(x, y);
                    this.TileArea.appendChild(tile.Element);
                }
            }
            // We can't set the opacity in the same frame as we append to the DOM,
            // the transition won't be triggered
            setTimeout(() => {
                for (let y = 0; y < BoardSize; y++) {
                    for (let x = 0; x < BoardSize; x++) {
                        let tile = this.Tiles[x][y];
                        if (!tile)
                            continue;
                        tile.Element.style.opacity = "1";
                    }
                }
            }, 1);
            this.findValidMoves();
        }
        findValidMoves() {
            for (let y = 0; y < BoardSize; y++) {
                for (let x = 0; x < BoardSize; x++) {
                    let tile = this.Tiles[x][y];
                    if (!tile)
                        continue;
                    if (this.GapX == x || this.GapY == y)
                        tile.setSelectable(true);
                    else
                        tile.setSelectable(false);
                }
            }
        }
        slideTileAt(tx, ty, skipChecks = false) {
            let tile = fifteen.util.assertDefined(this.Tiles[tx][ty]);
            if (tile.PosX == this.GapX) {
                if (tile.PosY > this.GapY) {
                    for (let y = this.GapY + 1; y <= tile.PosY; y++) {
                        this.moveTileToGap(fifteen.util.assertDefined(this.Tiles[tile.PosX][y]));
                    }
                }
                else {
                    for (let y = this.GapY - 1; y >= tile.PosY; y--) {
                        this.moveTileToGap(fifteen.util.assertDefined(this.Tiles[tile.PosX][y]));
                    }
                }
            }
            else if (tile.PosY == this.GapY) {
                if (tile.PosX > this.GapX) {
                    for (let x = this.GapX + 1; x <= tile.PosX; x++) {
                        this.moveTileToGap(fifteen.util.assertDefined(this.Tiles[x][tile.PosY]));
                    }
                }
                else {
                    for (let x = this.GapX - 1; x >= tile.PosX; x--) {
                        this.moveTileToGap(fifteen.util.assertDefined(this.Tiles[x][tile.PosY]));
                    }
                }
            }
            else {
                throw "Invalid tile to slide!";
            }
            if (!skipChecks) {
                this.postMoveChecks();
            }
        }
        moveTileToGap(tile) {
            this.Tiles[this.GapX][this.GapY] = tile;
            this.Tiles[tile.PosX][tile.PosY] = undefined;
            let x = tile.PosX, y = tile.PosY;
            tile.setPos(this.GapX, this.GapY);
            this.GapX = x;
            this.GapY = y;
        }
        postMoveChecks() {
            if (this.isInOrder()) {
                this.onGameOver();
            }
            else {
                this.findValidMoves();
            }
        }
        isInOrder() {
            // Only in order if the gap is at the first or last spot, just because
            // I don't feel good about the gap being in the middle somewhere
            if ((this.GapX != 0 || this.GapY != 0) &&
                (this.GapX != BoardSize - 1 || this.GapY != BoardSize - 1))
                return false;
            let nextNum = 1;
            for (let y = 0; y < BoardSize; y++) {
                for (let x = 0; x < BoardSize; x++) {
                    let tile = this.Tiles[x][y];
                    if (!tile)
                        continue;
                    if (tile.Number != nextNum)
                        return false;
                    nextNum++;
                }
            }
            return true;
        }
        onGameOver() {
            fifteen.Sounds.VICTORY.play();
            for (let y = 0; y < BoardSize; y++) {
                for (let x = 0; x < BoardSize; x++) {
                    let tile = this.Tiles[x][y];
                    if (!tile)
                        continue;
                    tile.setSelectable(false);
                }
            }
            setTimeout(() => {
                for (let y = 0; y < BoardSize; y++) {
                    for (let x = 0; x < BoardSize; x++) {
                        let tile = this.Tiles[x][y];
                        if (!tile)
                            continue;
                        tile.Element.style.opacity = "0";
                    }
                }
                setTimeout(() => {
                    this.showGameover();
                }, 250);
            }, 1000);
        }
        showGameover() {
            fifteen.ui.removeChildren(this.TileArea);
            let time = Date.now() - this.StartedAt;
            let seconds = Math.floor(time / 1000);
            let gameover = fifteen.util.assertNotNull(fifteen.ui.template("gameover_template"));
            let secondSpan = fifteen.util.assertNotNull(gameover.querySelector("span"));
            secondSpan.textContent = seconds.toString();
            this.TileArea.appendChild(gameover);
            let startButton = fifteen.util.assertNotNull(gameover.querySelector("button"));
            startButton.onclick = () => {
                fifteen.Sounds.CLICK.play();
                this.cleanup();
                this.startGame();
            };
        }
        cleanup() {
            fifteen.ui.removeChildren(this.TileArea);
            this.Tiles = [];
            this.Tiles.length = BoardSize;
            this.GapX = 0;
            this.GapY = 0;
            this.StartedAt = 0;
            for (let x = 0; x < BoardSize; x++) {
                let col = [];
                col.length = BoardSize;
                this.Tiles[x] = col;
            }
        }
    }
    fifteen.FifteenGame = FifteenGame;
})(fifteen || (fifteen = {}));
var fifteen;
(function (fifteen) {
    function init() {
        fifteen.sound.init("snd/");
        fifteen.sound.preloadAll(fifteen.Sounds, start);
    }
    fifteen.init = init;
    function start() {
        fifteen.CurrGame = new fifteen.FifteenGame();
        fifteen.CurrGame.showTitle();
    }
})(fifteen || (fifteen = {}));
var fifteen;
(function (fifteen) {
    var sound;
    (function (sound_1) {
        var BaseSoundUrl = "";
        var SoundInstPool = [];
        var NextId = -1;
        var MuteAll = false;
        var SoundEffectVolume = 1.0;
        class SoundImp {
            constructor(filename) {
                this.LoopInstId = 0;
                this.Filename = filename;
            }
            play(vol = 1.0) {
                if (!this.HowlSound)
                    return null;
                vol *= SoundEffectVolume;
                let inst = getSoundInst();
                let id = this.HowlSound.play();
                this.HowlSound.volume(vol, id);
                inst.init(this, id, vol);
                return inst;
            }
            loop(vol = 1.0) {
                if (!this.HowlSound)
                    return null;
                vol *= SoundEffectVolume;
                let inst = getSoundInst();
                inst.init(this, NextId, vol);
                inst.Looping = true;
                NextId -= 1;
                this.addLooper(inst);
                return inst;
            }
            addLooper(inst) {
                if (!this.HowlSound)
                    throw "No howl sound";
                if (this.Loops == null) {
                    this.Loops = {};
                    this.LoopInstId = this.HowlSound.play();
                    this.HowlSound.loop(true, this.LoopInstId);
                }
                this.Loops[inst.SoundId] = inst;
                this.recalcLoopVolume();
            }
            removeLooper(inst) {
                if (this.Loops)
                    delete this.Loops[inst.SoundId];
                this.recalcLoopVolume();
            }
            recalcLoopVolume() {
                if (!this.HowlSound)
                    throw "No howl sound";
                let vol = 0;
                let numSounds = 0;
                for (let id in this.Loops) {
                    let inst = this.Loops[id];
                    numSounds += 1;
                    if (inst.Volume > vol)
                        vol = inst.Volume;
                }
                if (numSounds == 0) {
                    this.HowlSound.stop(this.LoopInstId);
                    this.Loops = undefined;
                }
                else {
                    this.HowlSound.volume(vol, this.LoopInstId);
                }
            }
            load(onLoaded) {
                if (this.HowlSound) {
                    if (onLoaded)
                        onLoaded(true);
                    return;
                }
                let soundUrl = this.Filename;
                if (BaseSoundUrl && soundUrl.charAt(0) != "/")
                    soundUrl = BaseSoundUrl + soundUrl;
                this.HowlSound = new Howl({
                    src: [soundUrl],
                    autoplay: false,
                    loop: false,
                });
                if (onLoaded != undefined) {
                    this.HowlSound.once("load", () => {
                        onLoaded(true);
                    });
                    this.HowlSound.once("loaderror", () => {
                        onLoaded(false);
                        this.HowlSound = undefined;
                    });
                }
            }
        }
        class SoundInstImp {
            constructor() {
                this.SoundId = 0;
                this.Looping = false;
                this.Volume = 1.0;
            }
            init(parent, soundId, volume) {
                this.SoundId = soundId;
                this.Parent = parent;
                this.Volume = volume;
                if (this.Parent && this.Parent.HowlSound) {
                    let self = this;
                    this.Parent.HowlSound.once("end", function () {
                        if (self.Looping)
                            return; // Ignore ends within a looping sound
                        self.return();
                    }, soundId);
                }
            }
            return() {
                this.Parent = undefined;
                this.SoundId = 0;
                this.Looping = false;
                returnSoundInst(this);
            }
            getId() {
                return this.SoundId;
            }
            setVolume(vol) {
                if (!this.Parent || !this.Parent.HowlSound)
                    throw "No parent instance";
                this.Volume = vol;
                if (this.Looping) {
                    this.Parent.recalcLoopVolume();
                }
                else {
                    if (this.Parent)
                        this.Parent.HowlSound.volume(vol, this.SoundId);
                }
            }
            stop() {
                if (!this.Parent || !this.Parent.HowlSound)
                    throw "No parent instance";
                if (this.Looping) {
                    this.Looping = false;
                    this.Parent.removeLooper(this);
                }
                else {
                    if (this.Parent)
                        this.Parent.HowlSound.stop(this.SoundId);
                }
            }
        }
        function init(basesoundurl) {
            Howler.autoUnlock = false;
            MuteAll = localStorage.getItem("volume_mute") == "y";
            Howler.mute(MuteAll);
            let effectKey = localStorage.getItem("volume_effects");
            if (effectKey == null)
                effectKey = "1.0";
            SoundEffectVolume = parseFloat(effectKey);
            BaseSoundUrl = basesoundurl;
        }
        sound_1.init = init;
        function isMuted() {
            return MuteAll;
        }
        sound_1.isMuted = isMuted;
        function setMute(mute) {
            MuteAll = mute;
            localStorage.setItem("volume_mute", MuteAll ? "y" : "n");
            Howler.mute(MuteAll);
        }
        sound_1.setMute = setMute;
        function getEffectsVolume() {
            return SoundEffectVolume;
        }
        sound_1.getEffectsVolume = getEffectsVolume;
        function setEffectsVolume(volume) {
            if (volume < 0)
                volume = 0;
            else if (volume > 1)
                volume = 1;
            SoundEffectVolume = volume;
            localStorage.setItem("volume_effects", volume.toString());
        }
        sound_1.setEffectsVolume = setEffectsVolume;
        function preloadAll(obj, onDone) {
            let count = 0;
            for (let id in obj) {
                if (id)
                    count++;
            }
            for (let id in obj) {
                let sound = obj[id];
                sound.load((success) => {
                    count--;
                    if (count == 0)
                        if (onDone != undefined)
                            onDone();
                });
            }
        }
        sound_1.preloadAll = preloadAll;
        function make(filename) {
            return new SoundImp(filename);
        }
        sound_1.make = make;
        function getSoundInst() {
            let inst = SoundInstPool.pop();
            if (inst) {
                return inst;
            }
            return new SoundInstImp();
        }
        function returnSoundInst(inst) {
            SoundInstPool.push(inst);
        }
    })(sound = fifteen.sound || (fifteen.sound = {}));
})(fifteen || (fifteen = {}));
var fifteen;
(function (fifteen) {
    fifteen.Sounds = {
        CLICK: fifteen.sound.make("Click.mp3"),
        VICTORY: fifteen.sound.make("HarpUp.mp3")
    };
})(fifteen || (fifteen = {}));
var fifteen;
(function (fifteen) {
    const TilePixelSize = 128;
    class Tile {
        constructor(game, num) {
            this.PosX = 0;
            this.PosY = 0;
            this.Game = game;
            this.Number = num;
            this.Element = fifteen.util.assertNotNull(fifteen.ui.template("tile_template"));
            this.Element.style.opacity = "0";
            let tilenum = fifteen.util.assertNotNull(this.Element.querySelector(".tile_number"));
            tilenum.textContent = this.Number.toString();
            this.Selectable = false;
            this.setupClickListener();
        }
        setupClickListener() {
            this.Element.onclick = (e) => {
                e.preventDefault();
                this.select();
            };
            // Use touchstart instead of click on mobile, click usually feels too slow
            this.Element.addEventListener("touchstart", (ev) => {
                ev.preventDefault();
                this.select();
            });
        }
        setPos(x, y) {
            this.PosX = x;
            this.PosY = y;
            this.Element.style.left = TilePixelSize * x + "px";
            this.Element.style.top = TilePixelSize * y + "px";
        }
        setSelectable(selectable) {
            this.Selectable = selectable;
            if (selectable)
                this.Element.classList.add("valid_tile");
            else
                this.Element.classList.remove("valid_tile");
        }
        select() {
            if (!this.Selectable)
                return;
            fifteen.Sounds.CLICK.play();
            this.Game.slideTileAt(this.PosX, this.PosY);
        }
    }
    fifteen.Tile = Tile;
})(fifteen || (fifteen = {}));
var fifteen;
(function (fifteen) {
    var ui;
    (function (ui) {
        function template(id) {
            let item = document.getElementById(id);
            if (!item)
                return null;
            if (!(item instanceof HTMLTemplateElement))
                return null;
            let imported = document.importNode(item.content, true);
            let child = imported.firstElementChild;
            while (child) {
                if (child instanceof HTMLElement)
                    return child;
                child = child.nextElementSibling;
            }
            return null;
        }
        ui.template = template;
        function removeChildren(element) {
            while (element.lastChild) {
                element.removeChild(element.lastChild);
            }
        }
        ui.removeChildren = removeChildren;
    })(ui = fifteen.ui || (fifteen.ui = {}));
})(fifteen || (fifteen = {}));
var fifteen;
(function (fifteen) {
    var util;
    (function (util) {
        function assertDefined(val) {
            if (val == undefined)
                throw ("Unexpected undefined value!");
            return val;
        }
        util.assertDefined = assertDefined;
        function assertNotNull(val) {
            if (val == null)
                throw ("Unexpected null value!");
            return val;
        }
        util.assertNotNull = assertNotNull;
        function randInt(max) {
            return Math.floor(Math.random() * max);
        }
        util.randInt = randInt;
    })(util = fifteen.util || (fifteen.util = {}));
})(fifteen || (fifteen = {}));
//# sourceMappingURL=fifteen.js.map