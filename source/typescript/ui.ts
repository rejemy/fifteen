namespace fifteen.ui
{
	export function template(id:string):HTMLElement|null
	{
		let item:HTMLElement|null = document.getElementById(id);
		if(!item)
			return null;
		if(!(item instanceof HTMLTemplateElement))
			return null;
		let imported:DocumentFragment = document.importNode(item.content, true);
		let child:Element|null = imported.firstElementChild;
		while(child)
		{
			if(child instanceof HTMLElement)
				return child;
			child = child.nextElementSibling;
		}
		return null;
	}

	export function removeChildren(element:HTMLElement):void
	{
		while(element.lastChild)
		{
			element.removeChild(element.lastChild);
		}
	}

}