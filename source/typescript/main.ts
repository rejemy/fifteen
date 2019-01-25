namespace fifteen
{
	
	export var CurrGame:FifteenGame|undefined;

	export function init():void
	{
		sound.init("snd/");
		sound.preloadAll(Sounds, start);
	}

	function start():void
	{
		CurrGame = new FifteenGame();
		CurrGame.showTitle();
	}

}