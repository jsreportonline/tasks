var ejs = require('ejs')
var extend = require('node.extend')
var jade = require('jade');

module.exports = function (html, helpers, data) {
  var compiledTemplate = jade.compile(html);
  
  return function (helpers, data) {
    var templateHelpers = helpers ? { templateHelpers: helpers } : { templateHelpers: {} };

    var jadeMix = extend(true, data, templateHelpers)
  
    return compiledTemplate(jadeMix)
  }
}
