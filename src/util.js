// small but works-for-me stuff for testing javascripts
// not ready for "production" use

Object.inspect = function(obj) {
  var info = [];
  
  if(typeof obj in ["string","number"]) {
    return obj;
  } else {
    for(property in obj)
      if(typeof obj[property]!="function")
        info.push(property + ' => ' + 
          (typeof obj[property] == "string" ?
            '"' + obj[property] + '"' :
            obj[property]));
  }
  
  return ("'" + obj + "' #" + typeof obj + 
    ": {" + info.join(", ") + "}");
}

// borrowed from http://www.schuerig.de/michael/javascript/stdext.js
// Copyright (c) 2005, Michael Schuerig, michael@schuerig.de

Array.flatten = function(array, excludeUndefined) {
  if (excludeUndefined === undefined) {
    excludeUndefined = false;
  }
  var result = [];
  var len = array.length;
  for (var i = 0; i < len; i++) {
    var el = array[i];
    if (el instanceof Array) {
      var flat = el.flatten(excludeUndefined);
      result = result.concat(flat);
    } else if (!excludeUndefined || el != undefined) {
      result.push(el);
    }
  }
  return result;
};

if (!Array.prototype.flatten) {
  Array.prototype.flatten = function(excludeUndefined) {
    return Array.flatten(this, excludeUndefined);
  }
}

/*--------------------------------------------------------------------------*/

var Builder = {
  node: function(elementName) {
    var element = document.createElement('div');
    element.innerHTML = 
      "<" + elementName + "></" + elementName + ">";

    // attributes (or text)
    if(arguments[1])
      if(this._isStringOrNumber(arguments[1]) ||
        (arguments[1] instanceof Array)) {
          this._children(element.firstChild, arguments[1]);
        } else {
          var attrs = this._attributes(arguments[1]);
          if(attrs.length) 
            element.innerHTML = "<" +elementName + " " +
              attrs + "></" + elementName + ">";
        } 

    // text, or array of children
    if(arguments[2])
      this._children(element.firstChild, arguments[2]);

     return element.firstChild;
  },
  _text: function(text) {
     return document.createTextNode(text);
  },
  _attributes: function(attributes) {
    var attrs = [];
    for(attribute in attributes)
      attrs.push((attribute=='className' ? 'class' : attribute) +
          '="' + attributes[attribute].toString().escapeHTML() + '"');
    return attrs.join(" ");
  },
  _children: function(element, children) {
    if(typeof children=='object') { // array can hold nodes and text
      children.flatten().each( function(e) {
        if(typeof e=='object')
          element.appendChild(e)
        else
          if(Builder._isStringOrNumber(e))
            element.appendChild(Builder._text(e));
      });
    } else
      if(Builder._isStringOrNumber(children)) 
         element.appendChild(Builder._text(children));
  },
  _isStringOrNumber: function(param) {
    return(typeof param=='string' || typeof param=='number');
  }
}

/* ------------- element ext -------------- */

// adapted from http://dhtmlkitchen.com/learn/js/setstyle/index4.jsp
// note: Safari return null on elements with display:none; see http://bugzilla.opendarwin.org/show_bug.cgi?id=4125
// instead of "auto" values returns null so it's easier to use with || constructs

String.prototype.camelize = function() {
  var oStringList = this.split('-');
  if(oStringList.length == 1)    
    return oStringList[0];
  var ret = this.indexOf("-") == 0 ? 
    oStringList[0].charAt(0).toUpperCase() + oStringList[0].substring(1) : oStringList[0];
  for(var i = 1, len = oStringList.length; i < len; i++){
    var s = oStringList[i];
    ret += s.charAt(0).toUpperCase() + s.substring(1)
  }
  return ret;
}

Element.getStyle = function(element, style) {
  element = $(element);
  var value = element.style[style.camelize()];
  if(!value)
    if(document.defaultView && document.defaultView.getComputedStyle) {
      var css = document.defaultView.getComputedStyle(element, null);
      value = (css!=null) ? css.getPropertyValue(style) : null;
    } else if(element.currentStyle) {
      value = element.currentStyle[style.camelize()];
    }
    // If top, left, bottom, or right values have been queried, return "auto" for consistency resaons 
    // if position is "static", as Opera (and others?) returns the pixel values relative to root element 
    // (or positioning context?)
    if (window.opera && (style == "left" || style == "top" || style == "right" || style == "bottom"))
      if (Element.getStyle(element, "position") == "static") value = "auto";
    
  if(value=='auto') value = null;
  return value;
}

Element.makePositioned = function(element) {
  element = $(element);
  var pos = Element.getStyle(element, 'position');
  if(pos =='static' || !pos) {
    element._madePositioned = true;
    element.style.position = "relative";
    // Opera returns the offset relative to the positioning context, when an element is position relative 
    // but top and left have not been defined
    if (window.opera){
      element.style.top = 0;
      element.style.left = 0;
    }  
  }
}
  
Element.undoPositioned = function(element) {
  element = $(element);
  if(typeof element._madePositioned != "undefined"){
    element._madePositioned = undefined;
    element.style.position = "";
    element.style.top = "";
    element.style.left = "";
    element.style.bottom = "";
    element.style.right = "";	  
  }
}

Element.makeClipping = function(element) {
  element = $(element);
  if (typeof element._overflow != 'undefined') return;
  element._overflow = element.style.overflow;
  if((Element.getStyle(element, 'overflow') || 'visible') != 'hidden') element.style.overflow = 'hidden';
}

Element.undoClipping = function(element) {
  element = $(element);
  if (typeof element._overflow == 'undefined') return;
  element.style.overflow = element._overflow;
  element._overflow = undefined;
}

Element.collectTextNodesIgnoreClass = function(element, ignoreclass) {
  var children = $(element).childNodes;
  var text     = "";
  var classtest = new RegExp("^([^ ]+ )*" + ignoreclass+ "( [^ ]+)*$","i");

  for (var i = 0; i < children.length; i++) {
    if(children[i].nodeType==3) {
      text+=children[i].nodeValue;
    } else {
      if((!children[i].className.match(classtest)) && children[i].hasChildNodes())
        text += Element.collectTextNodesIgnoreClass(children[i], ignoreclass);
    }
  }

  return text;
}

// old: new Effect.ContentZoom(element, percent)
// new: Element.setContentZoom(element, percent) 

Element.setContentZoom = function(element, percent) {
  element = $(element);
  element.style.fontSize = (percent/100) + "em";  
  if(navigator.appVersion.indexOf('AppleWebKit')>0) window.scrollBy(0,0);
}

Element.getOpacity = function(element){
  return parseFloat(Element.getStyle(element, "opacity") 
    || Element.getStyle(element, "-moz-opacity") 
    || Element.getStyle(element, "-khtml-opacity") 
    || '1');
}

Element.setOpacity = function(element, value){
  element= $(element);
  var els = element.style;
  if (value == 1){
    els.opacity = typeof els.MozOpacity == "undefined" ? 1 : '0.999999';
    //els.MozOpacity = '0.999999';
    //els.KhtmlOpacity = 1;
    els.filter  = null;
  } else {
    if(value < 0.00001) value = 0;
    els.opacity = value;
    //els.MozOpacity = value;
    //els.KhtmlOpacity = value;
    els.filter  = "alpha(opacity:"+value*100+")";
  }  
}

Element.getInlineOpacity = function(element){
  element= $(element);
  var op;
  op = element.style.opacity;
  if (typeof op != "undefined" && op != "") return op;
  op = element.style.MozOpacity;
  if (typeof op != "undefined" && op != "") return op;
  op = element.style.KhtmlOpacity;
  if (typeof op != "undefined" && op != "") return op;
  return ""
}

Element.setInlineOpacity = function(element, value){
  element= $(element);
  var els = element.style;
  els.opacity = value;
  els.MozOpacity = value;
  els.KhtmlOpacity = value;
}

Element.getDimensions = function(element){
  element = $(element);
  // All *Width and *Height properties give 0 on elements with display "none", so enable the element temporarily
  if (element.style.display == "none"){
    var originalVisibility = element.style.visibility;
    var originalPosition = element.style.position;
    element.style.visibility = "hidden";
    element.style.position = "absolute";
    element.style.display = "";
    var originalWidth = element.clientWidth;
    var originalHeight = element.clientHeight;
    element.style.display = "none";
    element.style.position = originalPosition;
    element.style.visibility = originalVisibility;
    return {width: originalWidth, height: originalHeight};    
  } else {
    return {width: element.offsetWidth, height: element.offsetHeight};
  }
} 

/*--------------------------------------------------------------------------*/

Position.positionedOffset = function(element) {
  var valueT = 0, valueL = 0;
  do {
    valueT += element.offsetTop  || 0;
    valueL += element.offsetLeft || 0;
    element = element.offsetParent;
    if (element) {
      p = Element.getStyle(element,'position');
      if(p == 'relative' || p == 'absolute') break;
    }
  } while (element);
  return [valueL, valueT];
}

// Safari returns margins on body which is incorrect if the child is absolutely positioned.
// for performance reasons, we create a specialized version of Position.positionedOffset for
// KHTML/WebKit only

if(/Konqueror|Safari|KHTML/.test(navigator.userAgent)) {
  Position.cumulativeOffset = function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      
      if (element.offsetParent==document.body) 
        if (Element.getStyle(element,'position')=='absolute') break;
        
      element = element.offsetParent;
    } while (element);
    return [valueL, valueT];
  }
}

Position.page = function(forElement) {
  if(element == document.body) return [0, 0];
  var valueT = 0, valueL = 0;

  var element = forElement;
  do {
    valueT += element.offsetTop  || 0;
    valueL += element.offsetLeft || 0;

    // Safari fix
    if (element.offsetParent==document.body)
      if (Element.getStyle(element,'position')=='absolute') break;
      
  } while (element = element.offsetParent);

  element = forElement;
  do {
    valueT -= element.scrollTop  || 0;
    valueL -= element.scrollLeft || 0;    
  } while (element = element.parentNode);

  return [valueL, valueT];
}

// elements with display:none don't return an offsetParent, 
// fall back to  manual calculation
Position.offsetParent = function(element) {
  if(element.offsetParent) return element.offsetParent;
  if(element == document.body) return element;
  
  while ((element = element.parentNode) && element != document.body)
    if (Element.getStyle(element,'position')!='static')
      return element;
  
  return document.body;
}

Position.clone = function(source, target) {
  var options = Object.extend({
    setLeft:    true,
    setTop:     true,
    setWidth:   true,
    setHeight:  true,
    offsetTop:  0,
    offsetLeft: 0
  }, arguments[2] || {})
  
  // find page position of source
  source = $(source);
  var p = Position.page(source);

  // find coordinate system to use
  target = $(target);
  var delta = [0, 0];
  var parent = null;
  // delta [0,0] will do fine with position: fixed elements, 
  // position:absolute needs offsetParent deltas
  if (Element.getStyle(target,'position') == 'absolute') {
    parent = Position.offsetParent(target);
    delta = Position.page(parent);
  }
  
  // correct by body offsets (fixes Safari)
  if (parent==document.body) {
    delta[0] -= document.body.offsetLeft;
    delta[1] -= document.body.offsetTop; 
  }

  // set position
  if(options.setLeft)   target.style.left  = (p[0] - delta[0] + options.offsetLeft) + "px";
  if(options.setTop)    target.style.top   = (p[1] - delta[1] + options.offsetTop) + "px";
  if(options.setWidth)  target.style.width = source.offsetWidth + "px";
  if(options.setHeight) target.style.height = source.offsetHeight + "px";
}

Position.absolutize = function(element) {
  element = $(element);
  if(element.style.position=='absolute') return;
  Position.prepare();

  var offsets = Position.positionedOffset(element);
  var top     = offsets[1];
  var left    = offsets[0];
  var width   = element.clientWidth;
  var height  = element.clientHeight;

  element._originalLeft   = left - parseFloat(element.style.left  || 0);
  element._originalTop    = top  - parseFloat(element.style.top || 0);
  element._originalWidth  = element.style.width;
  element._originalHeight = element.style.height;

  element.style.position = 'absolute';
  element.style.top    = top + 'px';;
  element.style.left   = left + 'px';;
  element.style.width  = width + 'px';;
  element.style.height = height + 'px';;
}

Position.relativize = function(element) {
  element = $(element);
  if(element.style.position=='relative') return;
  Position.prepare();

  element.style.position = 'relative';
  var top  = parseFloat(element.style.top  || 0) - (element._originalTop || 0);
  var left = parseFloat(element.style.left || 0) - (element._originalLeft || 0);

  element.style.top    = top + 'px';
  element.style.left   = left + 'px';
  element.style.height = element._originalHeight;
  element.style.width  = element._originalWidth;
}

/*--------------------------------------------------------------------------*/

Element.Class = {
    // Element.toggleClass(element, className) toggles the class being on/off
    // Element.toggleClass(element, className1, className2) toggles between both classes,
    //   defaulting to className1 if neither exist
    toggle: function(element, className) {
      if(Element.Class.has(element, className)) {
        Element.Class.remove(element, className);
        if(arguments.length == 3) Element.Class.add(element, arguments[2]);
      } else {
        Element.Class.add(element, className);
        if(arguments.length == 3) Element.Class.remove(element, arguments[2]);
      }
    },

    // gets space-delimited classnames of an element as an array
    get: function(element) {
      element = $(element);
      return element.className.split(' ');
    },

    // functions adapted from original functions by Gavin Kistner
    remove: function(element) {
      element = $(element);
      var regEx;
      for(var i = 1; i < arguments.length; i++) {
        regEx = new RegExp("(^|\\s)" + arguments[i] + "(\\s|$)", 'g');
        element.className = element.className.replace(regEx, '')
      }
    },

    add: function(element) {
      element = $(element);
      for(var i = 1; i < arguments.length; i++) {
        Element.Class.remove(element, arguments[i]);
        element.className += (element.className.length > 0 ? ' ' : '') + arguments[i];
      }
    },

    // returns true if all given classes exist in said element
    has: function(element) {
      element = $(element);
      if(!element || !element.className) return false;
      var regEx;
      for(var i = 1; i < arguments.length; i++) {
        if((typeof arguments[i] == 'object') && 
          (arguments[i].constructor == Array)) {
          for(var j = 0; j < arguments[i].length; j++) {
            regEx = new RegExp("(^|\\s)" + arguments[i][j] + "(\\s|$)");
            if(!regEx.test(element.className)) return false;
          }
        } else {
          regEx = new RegExp("(^|\\s)" + arguments[i] + "(\\s|$)");
          if(!regEx.test(element.className)) return false;
        }
      }
      return true;
    },

    // expects arrays of strings and/or strings as optional paramters
    // Element.Class.has_any(element, ['classA','classB','classC'], 'classD')
    has_any: function(element) {
      element = $(element);
      if(!element || !element.className) return false;
      var regEx;
      for(var i = 1; i < arguments.length; i++) {
        if((typeof arguments[i] == 'object') && 
          (arguments[i].constructor == Array)) {
          for(var j = 0; j < arguments[i].length; j++) {
            regEx = new RegExp("(^|\\s)" + arguments[i][j] + "(\\s|$)");
            if(regEx.test(element.className)) return true;
          }
        } else {
          regEx = new RegExp("(^|\\s)" + arguments[i] + "(\\s|$)");
          if(regEx.test(element.className)) return true;
        }
      }
      return false;
    },

    childrenWith: function(element, className) {
      var children = $(element).getElementsByTagName('*');
      var elements = new Array();

      for (var i = 0; i < children.length; i++) {
        if (Element.Class.has(children[i], className)) {
          elements.push(children[i]);
          break;
        }
      }

      return elements;
    }
}