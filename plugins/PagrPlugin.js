/***
|''Name''|PagrPlugin|
|''Description''|Simple prev / next / to toc navigation based on a fixed ToC|
|''Documentation''|http://pagr.tiddlyspace.com|
|''Author''|Tobias Beer|
|''~CoreVersion''|2.5.3|
|''Version''|0.5.0 (2013-09-11)|
|''Readable source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/PagrPlugin.js|
|''License''|[[Creative Commons Attribution-ShareAlike 2.5 License|http://creativecommons.org/licenses/by-sa/2.5/]]|
***/
//{{{

(function($){

var me = config.macros.pagr = {

	//link formats
	fmtNext:   '[[%0 »|%0]]',
	fmtHome: '[[\u25B2|%0]]',
	fmtPrev:   '[[« %0|%0]]',
	//no default toc tiddler
	toc:'',

	handler: function(place, macroName, params, wikifier, paramString, theTiddler){

		//init vars
		var links, n, out='', p={}, prev, pos, pg, tid, tids, temp,
			//parse params
			px = paramString.parseParams('anon', null, true);

		//all params
		[
			'fmtPrev|p',
			'fmtHome|h',
			'fmtNext|n',
			'toc'

		//loop them
		].map(function(x){
			//split by pipe
			x = x.split('|');

			//get from parsed params or empty
			p[ x[1] ? x[1] : x[0] ] = getParam(px, x[0], me[x[0]]);
		});

		//get toc tiddler or section
		links = store.getTiddlerText(p.toc);

		//find the tid
		tid = story.findContainingTiddler(place);
		tid = tid ? tid.getAttribute('tiddler'):'';

		//neither tid (new or inexisting shadow) nor toc?
		if(!tid || !links)
			//off we go
			return;

		//find section separator
		pos = p.toc.indexOf('##');
		//get toc tiddler
		p.toc = p.toc.substr(0, pos > 0 ? pos : p.toc.length );

		//create temporary container
		temp = $('<div/>');

		//render toc in temporary container
		wikify(links, temp[0]);

		//initialise toc-tids
		tids = [];
		//loop all tiddlylinks from rendered toc
		$('.tiddlyLink', temp).each(function(){
			//add to toc-tids
			tids.push( $(this).attr('tiddlyLink') );
		})

		//find current tid in toc
		pos = tids.indexOf(tid);

		//tid not in toc? => nothing to do
		if(pos < 0) return;

		//determine previous and next tid
		prev = pos - 1 < 0 ? -1 : pos-1;
		next = pos + 1 >= tids.length ? 0 : pos + 1;

		//create pagr
		pg = createTiddlyElement(place,'div',null,'pagr');

		//when applicable, output...
		if (p.p && prev >=0 )
			out += p.p.format([ tids[prev] ]);		

		if (p.h)
			out += p.h.format([ p.toc      ]);

		if (p.n && next)
			out += p.n.format([ tids[next] ]);

		//render output
		wikify(out, pg);
	}
}

config.shadowTiddlers.StyleSheetPagr = '/*{{{*/ \n\
	.pagr {margin: 0 0 0.5em 1em;} \n\
	.pagr a{padding:5px;} \n\
	/*}}}*/';
store.addNotification("StyleSheetPagr", refreshStyles);

})(jQuery);
//}}}