namespace fifteen
{
	const TilePixelSize:number = 128;
	
	export class Tile
	{
		Game:FifteenGame;
		Number:number;
		Element:HTMLElement;
		Selectable:boolean;
		PosX:number=0;
		PosY:number=0;

		constructor(game:FifteenGame, num:number)
		{
			this.Game = game;
			this.Number = num;
			this.Element = util.assertNotNull(ui.template("tile_template"));
			this.Element.style.opacity = "0";
			let tilenum:HTMLElement = util.assertNotNull(this.Element.querySelector(".tile_number"));
			tilenum.textContent = this.Number.toString();
			this.Selectable = false;
			this.setupClickListener();
		}

		setupClickListener():void
		{
			this.Element.onclick = (e:MouseEvent):void=>{
				e.preventDefault();
				this.select();
			};

			// Use touchstart instead of click on mobile, click usually feels too slow
			this.Element.addEventListener("touchstart", (ev:TouchEvent):void=>{
				ev.preventDefault();
				this.select();
			});
		}

		setPos(x:number, y:number):void
		{
			this.PosX = x;
			this.PosY = y;
			this.Element.style.left = TilePixelSize*x+"px";
			this.Element.style.top = TilePixelSize*y+"px";
		}

		setSelectable(selectable:boolean):void
		{
			this.Selectable = selectable;
			if(selectable)
				this.Element.classList.add("valid_tile");
			else
				this.Element.classList.remove("valid_tile");
		}

		select():void
		{
			if(!this.Selectable)
				return;
			
			Sounds.CLICK.play();
			this.Game.slideTileAt(this.PosX, this.PosY);
		}
	}

}