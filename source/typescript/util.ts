namespace fifteen.util
{
	export function assertDefined<T>(val:T|undefined):T
	{
		if(val == undefined)
			throw("Unexpected undefined value!");
		return val;
	}

	export function assertNotNull<T>(val:T|null):T
	{
		if(val == null)
			throw("Unexpected null value!");
		return val;
	}

	export function randInt(max:number):number
	{
		return Math.floor(Math.random()*max);
	}
}