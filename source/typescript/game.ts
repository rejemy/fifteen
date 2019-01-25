namespace fifteen
{
	const BoardSize:number = 4;
	const ScrambleIterations:number = 1000;

	
	type TileSpot = Tile|undefined;

	export class FifteenGame
	{
		TileArea:HTMLElement;
		Tiles:TileSpot[][] = [];
		GapX:number = 0;
		GapY:number = 0;
		StartedAt:number = 0;

		constructor()
		{
			this.TileArea = util.assertNotNull(document.getElementById("tilearea"));
			this.cleanup();
		}

		showTitle():void
		{
			let title:HTMLElement = util.assertNotNull(ui.template("title_template"));
			this.TileArea.appendChild(title);

			let startButton:HTMLButtonElement = util.assertNotNull(title.querySelector("button"));
			startButton.onclick = ():void=>{
				Sounds.CLICK.play();
				this.startGame();
			};
		}

		startGame():void
		{
			ui.removeChildren(this.TileArea);

			let num:number = 0;
			for(let y:number=0; y<BoardSize; y++)
			{
				for(let x:number=0; x<BoardSize; x++)
				{
					if(num > 0)
					{
						let newTile:Tile = new Tile(this, num);
						this.Tiles[x][y] = newTile;
						newTile.setPos(x,y);
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

		scramble():void
		{
			// Remove elements so we're not transitioning while scrambling
			for(let y:number=0; y<BoardSize; y++)
			{
				for(let x:number=0; x<BoardSize; x++)
				{
					let tile:Tile|undefined = this.Tiles[x][y];
					if(!tile)
						continue;
							
					if(tile.Element.parentElement)
						tile.Element.remove();
				}
			}

			// Scrambling algorithm works by starting with a solvable board position,
			// then just randomly making moves. Each time, we build a list of possible
			// tiles we could pick, then we randomly pick one
			let choices:number[] = [];
			choices.length = BoardSize-1;
			for(let iteration:number=0; iteration<ScrambleIterations; iteration++)
			{
				let choiceX:number = 0;
				let choiceY:number = 0;

				// We first decide if we're going to move a column or row
				if(Math.random() > 0.5)
				{
					let pos:number=0;
					for(let x:number=0; x<BoardSize; x++)
					{
						if(x != this.GapX)
							choices[pos++] = x;
					}
					choiceX = choices[util.randInt(3)];
					choiceY = this.GapY;
				}
				else
				{
					let pos:number=0;
					for(let y:number=0; y<BoardSize; y++)
					{
						if(y != this.GapY)
							choices[pos++] = y;
					}
					choiceX = this.GapX;
					choiceY = choices[util.randInt(3)];
				}

				this.slideTileAt(choiceX, choiceY, true);
			}

			// Now put all the elements back at their new positions
			for(let y:number=0; y<BoardSize; y++)
			{
				for(let x:number=0; x<BoardSize; x++)
				{
					let tile:Tile|undefined = this.Tiles[x][y];
					if(!tile)
						continue;
					
					tile.setPos(x, y);
					this.TileArea.appendChild(tile.Element);
				}
			}

			// We can't set the opacity in the same frame as we append to the DOM,
			// the transition won't be triggered
			setTimeout(():void=>{
				for(let y:number=0; y<BoardSize; y++)
				{
					for(let x:number=0; x<BoardSize; x++)
					{
						let tile:Tile|undefined = this.Tiles[x][y];
						if(!tile)
							continue;
						
						tile.Element.style.opacity = "1";
					}
				}
			}, 1);

			this.findValidMoves();

		}

		findValidMoves():void
		{
			for(let y:number=0; y<BoardSize; y++)
			{
				for(let x:number=0; x<BoardSize; x++)
				{
					let tile:Tile|undefined = this.Tiles[x][y];
					if(!tile)
						continue;
							
					if(this.GapX == x || this.GapY == y)
						tile.setSelectable(true);
					else
						tile.setSelectable(false);
				}
			}
		}

		slideTileAt(tx:number, ty:number, skipChecks:boolean=false):void
		{
			let tile:Tile = util.assertDefined(this.Tiles[tx][ty]);
			if(tile.PosX == this.GapX)
			{
				if(tile.PosY > this.GapY)
				{
					for(let y:number = this.GapY+1; y<= tile.PosY; y++)
					{
						this.moveTileToGap(util.assertDefined(this.Tiles[tile.PosX][y]));
					}
				}
				else
				{
					for(let y:number = this.GapY-1; y>= tile.PosY; y--)
					{
						this.moveTileToGap(util.assertDefined(this.Tiles[tile.PosX][y]));
					}
				}
			}
			else if(tile.PosY == this.GapY)
			{
				if(tile.PosX > this.GapX)
				{
					for(let x:number = this.GapX+1; x<= tile.PosX; x++)
					{
						this.moveTileToGap(util.assertDefined(this.Tiles[x][tile.PosY]));
					}
				}
				else
				{
					for(let x:number = this.GapX-1; x>= tile.PosX; x--)
					{
						this.moveTileToGap(util.assertDefined(this.Tiles[x][tile.PosY]));
					}
				}
			}
			else
			{
				throw "Invalid tile to slide!";
			}

			if(!skipChecks)
			{
				this.postMoveChecks();
			}
			
		}

		private moveTileToGap(tile:Tile):void
		{
			this.Tiles[this.GapX][this.GapY] = tile;
			this.Tiles[tile.PosX][tile.PosY] = undefined;
			let x:number = tile.PosX, y:number=tile.PosY;

			tile.setPos(this.GapX, this.GapY);
			this.GapX = x;
			this.GapY = y;
		}

		postMoveChecks():void
		{
			if(this.isInOrder())
			{
				this.onGameOver();
			}
			else
			{
				this.findValidMoves();
			}
		}

		isInOrder():boolean
		{
			// Only in order if the gap is at the first or last spot, just because
			// I don't feel good about the gap being in the middle somewhere
			if((this.GapX != 0 || this.GapY != 0) &&
				(this.GapX != BoardSize-1 || this.GapY != BoardSize-1))
				return false;

			let nextNum:number = 1;

			for(let y:number=0; y<BoardSize; y++)
			{
				for(let x:number=0; x<BoardSize; x++)
				{
					let tile:Tile|undefined = this.Tiles[x][y];
					if(!tile)
						continue;
					
					if(tile.Number != nextNum)
						return false;
					nextNum++;
				}
			}

			return true;
		}

		onGameOver():void
		{
			Sounds.VICTORY.play();

			for(let y:number=0; y<BoardSize; y++)
			{
				for(let x:number=0; x<BoardSize; x++)
				{
					let tile:Tile|undefined = this.Tiles[x][y];
					if(!tile)
						continue;
							
					tile.setSelectable(false);
				}
			}

			setTimeout(():void=>{
				for(let y:number=0; y<BoardSize; y++)
				{
					for(let x:number=0; x<BoardSize; x++)
					{
						let tile:Tile|undefined = this.Tiles[x][y];
						if(!tile)
							continue;
								
						tile.Element.style.opacity = "0";
					}
				}

				setTimeout(():void=>{
					this.showGameover();
				}, 250);

			}, 1000);

		}

		showGameover():void
		{
			ui.removeChildren(this.TileArea);

			let time:number = Date.now() - this.StartedAt;
			let seconds:number = Math.floor(time / 1000);

			let gameover:HTMLElement = util.assertNotNull(ui.template("gameover_template"));
			let secondSpan:HTMLElement = util.assertNotNull(gameover.querySelector("span"));
			secondSpan.textContent = seconds.toString();
			this.TileArea.appendChild(gameover);

			let startButton:HTMLButtonElement = util.assertNotNull(gameover.querySelector("button"));
			startButton.onclick = ():void=>{
				Sounds.CLICK.play();
				this.cleanup();
				this.startGame();
			};
		}		

		cleanup():void
		{
			ui.removeChildren(this.TileArea);

			this.Tiles = [];
			this.Tiles.length = BoardSize;
			this.GapX = 0;
			this.GapY = 0;
			this.StartedAt = 0;

			for(let x:number=0; x<BoardSize; x++)
			{
				let col:Tile[] = [];
				col.length = BoardSize;
				this.Tiles[x] = col;
			}
		}


	}


}