
(function ( document, window ) {

    var pfx = (function () {

        var style = document.createElement('dummy').style,
            prefixes = 'Webkit Moz O ms Khtml'.split(' '),
            memory = {};

        return function ( prop ) {
            if ( typeof memory[ prop ] === "undefined" ) {

                var ucProp  = prop.charAt(0).toUpperCase() + prop.substr(1),
                    props   = (prop + ' ' + prefixes.join(ucProp + ' ') + ucProp).split(' ');

                memory[ prop ] = null;
                for ( var i in props ) {
                    if ( style[ props[i] ] !== undefined ) {
                        memory[ prop ] = props[i];
                        break;
                    }
                }

            }

            return memory[ prop ];
        }

    })();

    var arrayify = function ( a ) {
        return [].slice.call( a );
    };

    var css = function ( el, props ) {
        var key, pkey;
        for ( key in props ) {
            if ( props.hasOwnProperty(key) ) {
                pkey = pfx(key);
                if ( pkey != null ) {
                    el.style[pkey] = props[key];
                }
            }
        }
        return el;
    }

    var byId = function ( id ) {
        return document.getElementById(id);
    }

    var $ = function ( selector, context ) {
        context = context || document;
        return context.querySelector(selector);
    };

    var $$ = function ( selector, context ) {
        context = context || document;
        return arrayify( context.querySelectorAll(selector) );
    };

    var translate = function ( t ) {
        return " translate3d(" + t.x + "px," + t.y + "px," + t.z + "px) ";
    };

    var rotate = function ( r, revert ) {
        var rX = " rotateX(" + r.x + "deg) ",
            rY = " rotateY(" + r.y + "deg) ",
            rZ = " rotateZ(" + r.z + "deg) ";

        return revert ? rZ+rY+rX : rX+rY+rZ;
    };

    var scale = function ( s ) {
        return " scale(" + s + ") ";
    }

    // CHECK SUPPORT

    var ua = navigator.userAgent.toLowerCase();
    var impressSupported = ( pfx("perspective") != null ) &&
                           ( ua.search(/(iphone)|(ipod)|(ipad)|(android)/) == -1 );

    // DOM ELEMENTS

    var impress = byId("impress");

    if (!impressSupported) {
        impress.className = "impress-not-supported";
        document.documentElement.className += " impress-not-supported ";
        return;
    } else {
        impress.className = "";
    }

    var canvas = document.createElement("div");
    canvas.className = "canvas";

    arrayify( impress.childNodes ).forEach(function ( el ) {
        canvas.appendChild( el );
    });
    impress.appendChild(canvas);

    var steps = $$(".step", impress);

    // SETUP
    // set initial values and defaults

    document.documentElement.style.height = "100%";

    css(document.body, {
        height: "100%",
        overflow: "hidden"
    });

    var props = {
        position: "absolute",
        transformOrigin: "top left",
        transition: "all 1s ease-in-out",
        transformStyle: "preserve-3d"
    }

    css(impress, props);
    css(impress, {
        top: "50%",
        left: "50%",
        perspective: "0px" // 2d
    });
    css(canvas, props);

    var current = {
        translate: { x: 0, y: 0, z: 0 },
        rotate:    { x: 0, y: 0, z: 0 },
        scale:     1
    };

    steps.forEach(function ( el, idx ) {
        var data = el.dataset,
            step = {
                translate: {
                    x: data.x || 0,
                    y: data.y || 0,
                    z: data.z || 0
                },
                rotate: {
                    x: data.rotateX || 0,
                    y: data.rotateY || 0,
                    z: data.rotateZ || data.rotate || 0
                },
                scale: data.scale || 1
            };

        el.stepData = step;

        if ( !el.id ) {
            el.id = "step-" + (idx + 1);
        }

        css(el, {
            position: "absolute",
            transform: "translate(-50%,-50%)" +
                       translate(step.translate) +
                       rotate(step.rotate) +
                       scale(step.scale)//,

        });

    });

    var active = null;
    var hashTimeout = null;

    var select = function ( el ) {
        if ( !el || !el.stepData || el == active) {

            return false;
        }

        window.scrollTo(0, 0);

        var step = el.stepData;

        if ( active ) {
            active.classList.remove("active");
        }
        el.classList.add("active");

        impress.className = "step-" + el.id;

        window.clearTimeout( hashTimeout );
        hashTimeout = window.setTimeout(function () {
            window.location.hash = "#/" + el.id;
        }, 1000);

        var target = {
            rotate: {
                x: -parseInt(step.rotate.x, 10),
                y: -parseInt(step.rotate.y, 10),
                z: -parseInt(step.rotate.z, 10)
            },
            translate: {
                x: -step.translate.x,
                y: -step.translate.y,
                z: -step.translate.z
            },
            scale: 1 / parseFloat(step.scale)
        };

        var zoomin = target.scale >= current.scale;

        css(impress, {

            transform: scale(target.scale),
            transitionDelay: (zoomin ? "500ms" : "0ms")
        });

        css(canvas, {
            transform: rotate(target.rotate, true) + translate(target.translate),
            transitionDelay: (zoomin ? "0ms" : "500ms")
        });

        current = target;
        active = el;

        return el;
    }

    // EVENTS

    document.addEventListener("keydown", function ( event ) {
        if ( event.keyCode == 9 || ( event.keyCode >= 32 && event.keyCode <= 34 ) || (event.keyCode >= 37 && event.keyCode <= 40) ) {
            var next = active;
            switch( event.keyCode ) {
                case 33: ; // pg up
                case 37: ; // left
                case 38:   // up
                         next = steps.indexOf( active ) - 1;
                         next = next >= 0 ? steps[ next ] : steps[ steps.length-1 ];
                         break;
                case 9:  ; // tab
                case 32: ; // space
                case 34: ; // pg down
                case 39: ; // right
                case 40:   // down
                         next = steps.indexOf( active ) + 1;
                         next = next < steps.length ? steps[ next ] : steps[ 0 ];
                         break;
            }

            select(next);

            event.preventDefault();
        }
    }, false);

    document.addEventListener("click", function ( event ) {

        var target = event.target;
        while ( (target.tagName != "A") &&
                (!target.stepData) &&
                (target != document.body) ) {
            target = target.parentNode;
        }

        if ( target.tagName == "A" ) {
            var href = target.getAttribute("href");

            if ( href && href[0] == '#' ) {
                target = byId( href.slice(1) );
            }
        }

        if ( select(target) ) {
            event.preventDefault();
        }
    }, false);

    var getElementFromUrl = function () {

        return byId( window.location.hash.replace(/^#\/?/,"") );
    }

    window.addEventListener("hashchange", function () {
        select( getElementFromUrl() );
    }, false);
    
    select(getElementFromUrl() || steps[0]);

})(document, window);
