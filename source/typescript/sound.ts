namespace fifteen.sound
{
	var BaseSoundUrl:string = "";
	var SoundInstPool:SoundInstImp[] = [];
	var NextId:number = -1;

	var MuteAll:boolean = false;
	var SoundEffectVolume:number = 1.0;

	export interface SoundInst
	{
		getId():number;
		setVolume(vol:number):void;
		stop():void;
	}

	export interface Sound
	{
		play(vol?:number):SoundInst|null;
		loop(vol?:number):SoundInst|null;
		load(onLoaded?:(success:boolean)=>void):void;
	}

	class SoundImp implements Sound
	{
		HowlSound:Howl|undefined;
		Filename:string;

		Loops:{[id:string]:SoundInstImp}|undefined;
		LoopInstId:number=0;

		constructor(filename:string)
		{
			this.Filename = filename;
		}

		play(vol:number=1.0):SoundInst|null
		{
			if(!this.HowlSound)
				return null;

			vol *= SoundEffectVolume;
			let inst:SoundInstImp = getSoundInst();
			let id:number = this.HowlSound.play();
			this.HowlSound.volume(vol, id);
			inst.init(this, id, vol);
			return inst;
		}

		loop(vol:number=1.0):SoundInst|null
		{
			if(!this.HowlSound)
				return null;

			vol *= SoundEffectVolume;

			let inst:SoundInstImp = getSoundInst();
			inst.init(this, NextId, vol);
			inst.Looping = true;
			
			NextId -= 1;

			this.addLooper(inst);

			return inst;
		}

		private addLooper(inst:SoundInstImp):void
		{
			if(!this.HowlSound)
				throw "No howl sound";

			if(this.Loops == null)
			{
				this.Loops = {};
				this.LoopInstId = this.HowlSound.play();
				this.HowlSound.loop(true, this.LoopInstId);
			}

			this.Loops[inst.SoundId] = inst;

			this.recalcLoopVolume();
		}

		removeLooper(inst:SoundInstImp):void
		{
			if(this.Loops)
				delete this.Loops[inst.SoundId];
			
			this.recalcLoopVolume();
		}

		recalcLoopVolume():void
		{
			if(!this.HowlSound)
				throw "No howl sound";

			let vol:number = 0;
			let numSounds:number = 0;
			for(let id in this.Loops)
			{
				let inst:SoundInstImp = this.Loops[id];
				numSounds += 1;
				if(inst.Volume > vol)
					vol = inst.Volume;
			}

			if(numSounds == 0)
			{
				this.HowlSound.stop(this.LoopInstId);
				this.Loops = undefined;
			}
			else
			{
				this.HowlSound.volume(vol, this.LoopInstId);
			}
		}

		load(onLoaded?:(success:boolean)=>void):void
		{
			if(this.HowlSound)
			{
				if(onLoaded)
					onLoaded(true);
				
				return;
			}

			let soundUrl:string = this.Filename;
			if(BaseSoundUrl && soundUrl.charAt(0) != "/")
				soundUrl = BaseSoundUrl + soundUrl;
			
			this.HowlSound = new Howl(
				{
					src: [soundUrl],
					autoplay: false,
					loop: false,
				}
			);

			if(onLoaded != undefined)
			{
				this.HowlSound.once("load", ():void=>{
					onLoaded(true);
				});
				this.HowlSound.once("loaderror", ():void=>{
					onLoaded(false);
					this.HowlSound = undefined;
				});
			}
		}
	}

	class SoundInstImp implements SoundInst
	{
		Parent:SoundImp|undefined;
		SoundId:number=0;
		Looping:boolean=false;
		Volume:number=1.0;

		init(parent:SoundImp, soundId:number, volume:number):void
		{
			this.SoundId = soundId;
			this.Parent = parent;
			this.Volume = volume;

			if(this.Parent && this.Parent.HowlSound)
			{
				let self:SoundInstImp = this;
				this.Parent.HowlSound.once("end", function():void
				{
					if(self.Looping)
						return; // Ignore ends within a looping sound
					self.return();
				}, soundId);
			}
		}

		return():void
		{
			this.Parent = undefined;
			this.SoundId = 0;
			this.Looping = false;
			returnSoundInst(this);
		}

		getId():number
		{
			return this.SoundId;
		}

		setVolume(vol:number):void
		{
			if(!this.Parent || !this.Parent.HowlSound)
				throw "No parent instance";

			this.Volume = vol;

			if(this.Looping)
			{
				this.Parent.recalcLoopVolume();
			}
			else
			{
				if(this.Parent)
					this.Parent.HowlSound.volume(vol, this.SoundId);
			}
		}

		stop():void
		{
			if(!this.Parent || !this.Parent.HowlSound)
				throw "No parent instance";
				
			if(this.Looping)
			{
				this.Looping = false;
				this.Parent.removeLooper(this);
			}
			else
			{
				if(this.Parent)
					this.Parent.HowlSound.stop(this.SoundId);
			}
		}
	}

	export function init(basesoundurl:string):void
	{
		Howler.autoUnlock = false;
		
		MuteAll = localStorage.getItem("volume_mute") == "y";
		Howler.mute(MuteAll);

		let effectKey:string|null = localStorage.getItem("volume_effects");
		if(effectKey == null)
			effectKey = "1.0";
		SoundEffectVolume = parseFloat(effectKey);

		BaseSoundUrl = basesoundurl;
	}

	export function isMuted():boolean
	{
		return MuteAll;
	}

	export function setMute(mute:boolean):void
	{
		MuteAll = mute;
		localStorage.setItem("volume_mute", MuteAll ? "y" : "n");
		Howler.mute(MuteAll);
	}

	export function getEffectsVolume():number
	{
		return SoundEffectVolume;
	}

	export function setEffectsVolume(volume:number):void
	{
		if(volume < 0) volume = 0;
		else if(volume > 1) volume = 1;

		SoundEffectVolume = volume;
		localStorage.setItem("volume_effects", volume.toString());
	}

	export function preloadAll(obj:{[id:string]:Sound}, onDone?:()=>void):void
	{
		let count:number = 0;

		for(let id in obj)
		{
			if(id)
				count++;
		}

		for(let id in obj)
		{
			let sound:Sound = obj[id];
			
			sound.load((success:boolean):void=>{
				count--;
				if(count == 0)
					if(onDone != undefined)
						onDone();
			});
		}
	}

	export function make(filename:string):Sound
	{
		return new SoundImp(filename)
	}

	function getSoundInst():SoundInstImp
	{
		let inst:SoundInstImp|undefined = SoundInstPool.pop();
		if(inst)
		{
			return inst;
		}

		return new SoundInstImp();
	}

	function returnSoundInst(inst:SoundInstImp):void
	{
		SoundInstPool.push(inst);
	}

	

}