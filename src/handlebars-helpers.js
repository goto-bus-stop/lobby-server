module.exports = function (Handlebars) {

  Handlebars.registerHelper('json', function (o) {
    return new Handlebars.SafeString(JSON.stringify(o));
  });
  Handlebars.registerHelper('eq', function (a, b) { return a == b; });

};