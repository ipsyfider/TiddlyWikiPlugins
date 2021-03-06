/***
|''Name''|SlidrPlugin|
|''Description''|shows a tiddler timeline using sliders|
|''Documentation''|http://slidr.tiddlyspace.com|
|''Author''|Tobias Beer|
|''Version''|1.1.0 2013-09-27|
|''CoreVersion''|2.6.5|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/SlidrPlugin.js|
|''License''|[[Creative Commons Attribution-Share Alike 3.0|http://creativecommons.org/licenses/by-sa/3.0/]]|
{{{
<<slidr>>
}}}
<<slidr>>
!CODE
***/
//{{{
(function ($) {

    //define the macro
    config.macros.slidr = {

        //CONFIGURATION
        defaults: {

            //LOCALISATION
            //the slider tooltip | %0 = date range
            txtSliderTooltip: "Click to show tiddlers in '%0'. CTRL+Click to expand / collapse all.",
            //date error
            errDate: "%0 is not a valid start or end date!",
            //tiddler names
            lblTiddler1: "tiddler",
            lblTiddler2: "tiddlers",

            //PARAMETER DEFAULTs
            //the minimum number of tiddlers for subsliders
            minGroup: 7,
            //open when loaded
            openOnLoad : false,
            //drill down until this level
            level: 'month',
            //the date & sort field
            field: '-modified',
            //tiddlers to be excluded
            exclude: 'excludeLists',
            //whether to prevent double click
            noDblClick : true,

            //FORMATS
            //slider date formats
            fmtYear: 'YYYY',
            fmtMonth: 'MMM, YYYY',
            fmtDay: '0DD. mmm, YYYY',
            //tiddler date format
            fmtDate: '0hh:0mm',
            //tiddler date format displayed when above day list
            fmtDateFull: '0DD. mmm, YYYY',

            //the format for the count | %0 the date | %1 count
            fmtSlider: '{{slidr_title{%0}}}{{slidr_count{%1}}}',
            //the tiddler format | %0 tiddler title | %1 timestamp | %2 tags
            fmtTiddler:
                '\n{{slidr_entry{ {{slidr_date{%1}}}' + 
                  '{{slidr_tid{[[%0]]}}}'+
                  '{{slidr_tags{%2}}} }}}',
            //tag format
            fmtTag: '<<tag [[%0]]>>',
            //tag slider format
            fmtTagTitle: '<<tag [[%0]]>>',
            //counter format
            fmtCount: '(%0 %1)'
        },

        //the handler
        handler: function (place, macroName, params, wikifier, paramString, tiddler) {
            var dt, e, err, errEnd, fld, l, s,
                t, tx, tid, tids=[], tt, yrs = [],
                cm = config.messages,
                //a bunch of date validation params
                y, m, d, Y, M, D, YMD, YmD, YMd, yMD, Ymd, yMd, ymD, ymd,
                //reference to defaults
                def = this.defaults,
                //parse params 
                p0 = paramString.parseParams('anon', null, true),
                //get param template
                pd = store.getTiddlerText(getParam(p0, 'config', '')),
                //param template found? => parse that, otherwise take as given
                p = pd ? pd.parseParams('anon', null, true) : p0,
                //display tags?
                tags = p[0]['anon'] && p[0]['anon'].contains('tags') ? [] : undefined;
                //get year month day
                year = parseInt(getParam(p, 'year')),
                month = parseInt(getParam(p, 'month')),
                day = parseInt(getParam(p, 'day')),
                //start and end date
                s = getParam(p, 'start'),
                e = getParam(p, 'end'),
                //get level
                l = getParam(p, 'level', tags ? '' : def.level),
                //tagged tiddlers to be excluded
                ex = getParam(p, 'exclude', def.exclude).readBracketedList(),
                //get field
                f = getParam(p, 'field', def.field),
                //or kept
                keep = getParam(p, 'keep', '').readBracketedList(),
                //get only tagged?
                filter = getParam(p, 'filter', ''),
                //tiddler format
                format = getParam(p, 'format', def.fmtTiddler),
                //get item template
                template = getParam(p, 'template', ''),
                //save configuration to wrapper (later)
                px = {
                    //tiddler format
                    open: getParam(p, 'open', def.openOnLoad),
                    //get year, month, day
                    year: year,
                    month: month,
                    day: day,
                    //date formats
                    fmtDate: def.fmtDate,
                    fmtDateUser: getParam(p, 'dateformat'),
                    fmtDateFull: getParam(p, 'dateformat.full', def.fmtDateFull),
                    fmtYear: getParam(p, 'format.year', def.fmtYear),
                    fmtMonth: getParam(p, 'format.month', def.fmtMonth),
                    fmtDay: getParam(p, 'format.day', def.fmtDay),
                    //the number of minimum items for further drilldown
                    min: getParam(p, 'min', def.minGroup),
                    //exclude
                    ex: ex,
                    //tags to be excluded
                    hideTags: getParam(p, 'hideTags', '').readBracketedList()
                },
                //determine descending
                desc = f.substr(0, 1) == '-',
                //helper function to add to index
                last = function (arr, el) {
                    //get last
                    var l = arr[arr.length - 1],
                        newEl = [el, []];
                    //new index item
                    if (!l || el != l[0]) {
                        //add new index item
                        arr.push(newEl);
                        //get last again
                        l = arr[arr.length - 1];
                    }
                    //return last element
                    return l[1];
                };

             //template specified?
            if(template){
                //fetch it
                template = store.getTiddlerText(template);
                //found? => use it
                if(template)format = template;
            }
            //set tiddler format
            px.fmtTiddler = format;

            //check if end date wrong
            errEnd = e ? !this.isValidDate(e) : false;

            //either date invalid?
            if (errEnd || (s ? !this.isValidDate(s) : false)) {
                //date error
                createTiddlyError(
                    place,
                    cm.macroError.format(['slidr']),
                    cm.macroErrorDetails.format([
                        'slidr',
                        def.errDate.format([
                            errEnd ? e : s
                        ])
                    ])
                );
                return;
            }

            //get dates
            s = s ? Date.convertFromYYYYMMDDHHMM(s) : s;
            e = e ? Date.convertFromYYYYMMDDHHMM(e) : e;

            //failsafe level
            l = l.toLowerCase();
            //remove trailing s
            l = l.substr(l.length - 1) == 's' ? l.substr(0, l.length - 1) : l;
            //add to params
            px.level = l;

            //fix field name when desc
            fld = desc || f.substr(0, 1) == '+' ? f.substr(1) : f;

            //filter defined?
            if(filter){
                //get filtered tids
                tids = store.sortTiddlers(store.filterTiddlers(filter), f);
            //no filter?
            } else {
                //get all tids sorted by fields
                tids = store.getTiddlers(fld);
                //if desc => reverse
                if (desc) tids.reverse();
            }

            //loop all tids
            for (t = 0; t < tids.length; t++) {
                //the tid
                tid = tids[t];
                //get tags
                tt = tid.tags ? tid.tags : [];
                //when excluded => skip
                if (
                    !(
                        keep.contains(tid.title) ||
                        tt.containsAny(keep)
                    ) &&
                    (
                        ex.contains(tid.title) ||
                        tt.containsAny(ex)
                    )
                ) continue;

                //the title
                ti = tid.title;
                //get date
                dt = tid[fld] || tid.fields[fld];

                //when no date
                if (!dt.getMonth)
                    //convert to date
                    dt = Date.convertFromYYYYMMDDHHMM(dt);

                //get date values
                y = dt.getYear() + 1900;
                m = dt.getMonth() + 1;
                d = dt.getDate() + 1;

                //check if matches
                Y = y == year;
                M = m == month;
                D = d == day;

                //none given
                YMD = !year && !month && !day;
                //year given but not month or day
                yMD = year && !month && !day;
                //year and month given
                ymD = year && month && !day;
                //year month and day given
                ymd = year && month && day;
                //only month asked
                YmD = !year && month && !day;
                //only day asked
                YMd = !year && !month && day;
                //year and day given
                yMd = year && !month && day;
                //month and day given
                Ymd = !year && month && day;

                //when any match
                if (
                    //date range checks
                    (
                        //after start
                        (!s || s && dt >= s) &&
                        //before end
                        (!e || e && dt <= e)
                    ) &&
                    //date param constraints
                    (
                        YMD ||
                        yMD && Y ||
                        YmD && M ||
                        YMd && D ||
                        ymD && Y && M ||
                        Ymd && M && D ||
                        yMd && Y && D ||
                        ymd && Y && M && D
                    )
                ) {
                    //get last day index � from last month index � from last year index
                    tx = last(last(last(yrs, y), m), d);

                    //and add tiddler to the tiddler index
                    tx.push({
                        //tiddler title
                        title: ti,
                        //tiddler date
                        date: dt,
                        //tags
                        tags: tid.tags
                    });
                }
                //display tags?
                if(tags){
                    //loop all tags
                    $.each(tt, function(i,t){
                        //add to tags
                        if(
                            keep.contains(t) ||
                            (
                                !ex.contains(t) && 
                                !px.hideTags.contains(t)
                            )
                        ) tags.pushUnique(t);
                    })
                }
            }
            //add index to params
            px['yrs'] = yrs;

            //create wrapper
            place = createTiddlyElement(place, 'div', null, 'slidr');
            //and a clear
            $('<div class="slidr_clear"/>').insertAfter($(place));

            //add config to data
            $(place).data('params', px);

            //prevent doubleclick?
            if(def.noDblClick)
                //do it
                $(place).dblclick(function(){return false});

            //what to get
            what = (
                day ? 'day' : (
                month ? 'month' : (
                year ? 'year' : ''
            )));

            if(tags)tags.sort(function (a, b) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
            });

            //render sliders
            this.renderSliders(place, what, year, month, day, tags);
        },

        /* render slider elements */
        renderSliders: function (place, what, year, month, day, tags) {
            var bT, s, sx = [], tids,
                //reference to macros
                ts = config.macros.slidr,
                //keys
                yks = [], mks = [], dks = [],
                //read params
                px = $(place).closest('.slidr').data('params'),
                //get index
                yrs = px.yrs,
                //helper function to add sliders
                addSlider = function (ti, y, m, d, ts) {
                    sx.push({
                        title: ti,
                        year: y,
                        month: m,
                        day: d,
                        tids: ts
                    })
                };

            //output tags?
            if(tags){
                //loop tags
                $.each(tags, function(i,t){
                    //get tids for tag
                    tids = ts.getTids(px, yrs, px.level ? true : false, t );
                    //list of tids or count?
                    bT = typeof tids == 'object';
                    //if there are tids
                    if(bT && tids.length || tids > 0)
                        //add to sliders
                        addSlider(
                            t,
                            null,
                            null,
                            null,
                            tids
                        )
                });
            //otherwise go through years
            }else{
                //loop all years
                $.each(yrs, function (i, Y) {
                    //year key
                    yK = Y[0];
                    //year value
                    yV = Y[1];
                    //when blank or year
                    if (!what || what == 'year') {
                        //year key matches?
                        if (!what || !year || yK == year)
                            //add to sliders
                            addSlider(
                                ts.formatDate(yK, '11', '11', px.fmtYear),
                                yK,
                                isNaN(month) ? null : month,
                                isNaN(day) ? null : day,
                                ts.getTids(
                                    px,
                                    yV,
                                    px.level == 'year' ? false : true
                                )
                            );
                    //or check months
                    } else {
                        //loop all months
                        $.each(yV, function (i, M) {
                            //month key
                            mK = M[0];
                            //month value
                            mV = M[1];
                            //when month
                            if (what == 'month') {
                                //month key matches?
                                if ((!month || mK == month) && (!year || yK == year)) {
                                    //add to sliders
                                    addSlider(
                                        ts.formatDate(yK, mK, '11', px.fmtMonth),
                                        yK,
                                        mK,
                                        isNaN(day) ? null : day,
                                        ts.getTids(
                                            px,
                                            mV,
                                            px.level == 'month' ? false : true
                                        )
                                    );
                                }
                                //or check days
                            } else {
                                //loop all days
                                $.each(mV, function (i, D) {
                                    //day key
                                    dK = D[0];
                                    //day value
                                    dV = D[1];

                                    //day key matches?
                                    if ((!day || mK == day) && (!year || yK == year) && (!month || mK == month)) {
                                        //add to sliders
                                        addSlider(
                                            ts.formatDate(yK, mK, dK, px.fmtDay),
                                            yK, mK, dK,
                                            ts.getTids(px, dV)
                                        );
                                    }
                                });
                            }
                        });
                    }
                });
            }

            //loop sliders
            for (s = 0; s < sx.length; s++) {
                //create slider
                this.createSlider(place, sx[s], what, px.open);
            }
        },

        /* creates the slider */
        createSlider: function (place, slider, what, open) {
            var 
                tags = !slider.year;
                //refernce to defaults
                def = config.macros.slidr.defaults,
                //get count
                count = parseInt(slider.tids) ? slider.tids : slider.tids.length,
                //create slider button
                $s = $(createTiddlyElement(
                    place,
                    'a',
                    null,
                    'button slidr_button',
                    null,
                    {
                        //add a tooltip using the slider title
                        title: def.txtSliderTooltip.format([slider.title]),
                        //y, m, d attribs
                        year: slider.year,
                        month: slider.month,
                        day: slider.day,
                    }
                ))
                    //append tiddlers
                    .data('tiddlers', slider.tids)
                    //add click handler
                    .click(this.click);

            if(tags)$s.attr('tag',slider.title);
            //render button text
            wikify(
                //apply slider format
                def.fmtSlider.format([
                    //using the title, e.g. the year, month or day
                    (tags ? def.fmtTagTitle : '%0').format([slider.title]),
                    //apply slider format
                    def.fmtCount.format([
                        //and the tidder count
                        count,
                        //label for tids
                        count > 1 ? def.lblTiddler2 : def.lblTiddler1
                    ])
                ]),
                $s[0]
            );

            //open when desired
            if (open) $s.click();
        },

        /* handles slider click */
        click: function (ev) {
            var out = '', open, was, place,
                //reference to macro
                ts = config.macros.slidr,
                //get event
                e = ev || window.event,
                //get slider button
                $sb = $(resolveTarget(e)).closest('.slidr_button'),
                //get tag from tag button
                stag = $sb.attr('tag'),
                //get slidr
                $s = $sb.closest('.slidr'),
                //get params
                px = $s.data('params'),
                //as jQuery object
                $sp = $sb.next(),
                //get year
                year = parseInt($sb.attr('year')),
                //get year
                month = parseInt($sb.attr('month')),
                //get year
                day = parseInt($sb.attr('day')),
                //what next?
                next = day ? 'tids' : month ? 'day' : year ? 'month' : '',
                //get tids
                tids = $sb.data('tiddlers'),
                //output tids?
                bT = typeof tids == 'object',
                //the button text
                txt = $sb.text(),
                //get ctrl key
                ctrl = e.ctrlKey,
                //open all only when
                openAll =
                    //ctrl is pressed AND
                    ctrl && 
                    (
                        //this button will be open any second OR
                        !$sb.is('.slidr_open') ||
                        //this is not a toplevel button AND
                        !$sb.parent().is('.slidr') &&
                        //there are any unopened besides this
                        $('.slidr_button',$s).not('.slidr_open').length > 0
                    );

            //slider exists?
            if ($sp.hasClass('slidr_list')) {

                //when hidden
                if ($sp.is(':hidden')) {
                    //show
                    $sp.slideDown();
                    //add class open
                    $sb.addClass('slidr_open');
                //when visible but not all to be opened
                } else if (!openAll) {
                    //hide all inner
                    $sp.find('.slidr_list').slideUp()
                        .prev().removeClass('slidr_open');
                    //hide this
                    $sp.slideUp();
                    //remove class open
                    $sb.removeClass('slidr_open');
                }

            //no slider yet?
            } else {
                //add container
                place = (
                    $('<div class="slidr_list' +
                        (bT ? ' slidr_tids' : '') +
                    '"/>')
                    .insertAfter($sb)
                )[0];

                //when tidlist
                if (bT) {
                    //loop tids
                    $.each(tids, function (i, t) {
                        //create date
                        var dt = new Date(t.date),
                            tags = "";

                        //get included tags
                        t.tags.map(function (tag) {
                            if (
                                    //if not current tag
                                    stag != tag &&
                                    //and not in excludelist
                                    !px.ex.contains(tag) &&
                                    //and not hidden
                                    !px.hideTags.contains(tag)
                                )
                                //add to display tags
                                tags += ts.defaults.fmtTag.format([tag]);
                        });

                        //add to output
                        out += px.fmtTiddler.format([
                            //the title
                            t.title,
                            //the formated date
                            dt.formatString(
                                //user defined date format => take that
                                px.fmtDateUser ? px.fmtDateUser : (
                                    //when day and day level reached
                                    day && px.level == 'day' ?
                                    //take day format
                                    px.fmtDate:
                                    //take full date
                                    px.fmtDateFull
                                )
                            ),
                            tags
                        ]);
                    });
                    //render the list
                    wikify(out.substr(0, 1) == '\n' ? out.substr(1) : out, place);
                    //drill down some more...
                } else {
                    //next level of sliders
                    ts.renderSliders(place, next, year, month, day);
                }
                //show stuff
                $(place).slideDown();
                //add class open
                $sb.addClass('slidr_open');
            }
            //control key pressed?
            if(ctrl){
                //remember global default
                was = px.open == 'true';
                //set temporarily to open
                px.open = openAll;

                //loop all (outer when closed) slidr buttons
                $((!openAll ? ' > ' : '') + '.slidr_button', $s).each(function(i){
                    //the button
                    var $el = $(this),
                        isOpen = $el.hasClass('slidr_open');

                    //if in a different state?
                    if(
                         openAll && !isOpen ||
                        !openAll &&  isOpen
                    //make same state
                    ){
                        $el.click();
                    }
                })
                //reset global default
                px.open = was ? 'true' : 'false';
            }
        },

        /* retrieves the tids from a date range */
        getTids: function (params, arr, count, tag) {
            var num = 0, tids = [],
                //recursively find tiddlers
                nextLevel = function (i, el) {
                    //there is another list inside
                    if (typeof el[0] == 'number') {
                        //go deeper
                        $.each(el[1], function (i, el) { nextLevel(i, el) });
                    //these are the tids?
                    } else {
                        //if tag matches
                        if(!tag || el.tags.contains(tag)){
                            //increment count
                            num++;
                            //put into tids
                            tids.push(el);
                        }
                    }
                }

            //loop all elements
            $.each(arr, function (i, el) { nextLevel(i, el); });
            //return count or tids
            return !count || num < params.min ? tids : num;
        },

        /* gets a formatted date */
        formatDate: function (y, m, d, fmt) {
            //return formatted date
            return Date.convertFromYYYYMMDDHHMM(
                //year to YYYY
                String.zeroPad(y, 4) +
                //month to 0MM
                String.zeroPad(m, 2) +
                //days to 0DD
                String.zeroPad(d, 2) +
                //arbitrary time
                '1111'
            //apply format
            ).formatString(fmt);
        },

        /* checks date validity */
        isValidDate: function (d) {
            var match = /(\d{4})(\d{2})(\d{2})$/.exec(d),
            isDate = function (y, m, d) {
                return m > 0 && m < 13 && y > 0 && y < 32768 && d > 0 && d <= (new Date(y, m, 0)).getDate();
            };
            return match && isDate(match[1], match[2], match[3]);
        }
    }

    //write styles to shadow
    config.shadowTiddlers['StyleSheetSlidr'] =
        '/*{{{*/\n%0\n/*}}}*/'.format([store.getTiddlerText("SlidrPlugin##CSS")]);
    //activate styles
    store.addNotification('StyleSheetSlidr', refreshStyles)

})(jQuery);
//}}}

//{{{
/*
!CSS
.slidr{
    clear:left;
    width:90%;
}
.slidr_button,
.viewer .slidr_button{
    width:100%;
    display:block;
    cursor:pointer;
    margin:0;
    padding:0;
    clear:left;
}
.viewer .slidr_button .button{
    border-color:transparent;
    background:transparent;
}
.viewer .slidr_button:hover .button{
    color:[[ColorPalette::SecondaryMid]];
    background:[[ColorPalette::Background]];
}
.viewer .slidr_button .button:hover{
    color:[[ColorPalette::SecondaryDark]];
    background:[[ColorPalette::Background]];
}
.viewer .slidr_title{
    padding-left:7px;
}
.viewer .slidr_list .slidr_title{
    padding-left:14px;
}
.viewer .slidr_list .slidr_list .slidr_title{
    padding-left:21px;
}
.slidr_entry:hover,
.slidr_list .slidr_list .slidr_open{
    background:[[ColorPalette::TertiaryPale]];
}
.slidr_open{
    background:[[ColorPalette::SecondaryLight]];
}
.slidr_list .slidr_open{
    background:[[ColorPalette::SecondaryPale]];
}
.slidr_list{
    width:100%;
    display:block;
    display:none;
}
.slidr_list ul,
.slidr_list li{
    margin:0;
    padding:0;
    list-style-type:none;
}
.slidr_clear{
    height:1px;
    clear:both;
}
.slidr_tid,
.slidr_tags,
.slidr_date,
.slidr_entry{
    float:left;
    display:block;
}
.slidr_entry{
    width:100%;
    padding:1px;
}
.slidr_tid{
    margin-left:7px;
}
.slidr_tags{
    float:right;
    text-align:right;
    min-width:300px;
    max-width:50%;
    margin-left:7px;
}
.viewer .slidr_tags .button {
    margin-right:0;
    display:inline-block;
}
.slidr_count{
    float:right;
    margin:0 7px 0 2em;
}
.slidr_tids {
    padding:1px 0;
}
!END
*/
//}}}