#!/usr/bin/env node

const meow = require("meow");
const hljs = require("highlight.js");
const iterator = require("markdown-it-for-inline");
const markdown = require("markdown-it")({
  highlight: (string, lang) => {
    try {
      if (lang) {
        return hljs.highlight(lang, string).value;
      } else {
        return hljs.highlightAuto(string).value;
      }
    } catch (e) {
    }
    return "";
  }
}).use(
  require("markdown-it-sup")
).use(require("markdown-it-sub")).use(iterator, "url_new_win", "link_open", function(tokens, idx) {
  tokens[idx].attrPush([ "target", "_blank" ]);
}).use(require("markdown-it-container"), "small", {
  marker: "§",
  validate: str => true,
  render: function(tokens, idx) {
    const block = tokens[idx];
    if (block.nesting === 1) {
      var m = tokens[idx].info.trim().replace('§§§', '');
      return "<p><small>" + markdown.utils.escapeHtml(m);
    } else {
      return "</small></p>";
    }
  }
});
const hbs = require("handlebars");
const chokidar = require("chokidar");
const { readFileSync, writeFileSync } = require("fs");

const cli = meow(
  `
	Usage
	$ <filename>

	Options
	--template, -t  The template file to use (must be mustache)
	--watch, -w  Watch files for changes
	--stdout, -s  Output the html to stdout
	--output, -o  The .html file name (will be written to if stdout not specified)
    --title, -t  The title for the html file (filename used instead)

	  Example
	  $ simple-blog my-amazing-post.md
	  $ simple-blog --watch --template main.mustache my-amazing-post.md
	  `
);

const [ file ] = cli.input;

if (!file) cli.showHelp(1);

const render = () => {
  const templateContent = hbs.compile(
    readFileSync(cli.flags.template || __dirname + "/template.hbs").toString()
  );
  const content = readFileSync(file);
  const post = markdown.render(content.toString());
  const html = templateContent({
    content: post,
    title: cli.flags.title || cli.flags.t || file
  });

  if (cli.flags.stdout || cli.flags.s) {
    console.log(html);
  } else {
    const outputFile = cli.flags.output ||
      cli.flags.o ||
      file.replace(".md", ".html");
    writeFileSync(outputFile, html);
    console.log(`Wrote to file: ${outputFile}`);
  }
};

if (cli.flags.watch !== undefined) {
  let pathToWatch = [
    typeof cli.flags.watch === "string" ? cli.flags.watch : file
  ];
  if (cli.flags.template) {
    pathToWatch = pathToWatch.concat(cli.flags.template);
  }
  console.log(`Watching: ${pathToWatch}`);
  chokidar.watch(pathToWatch).on("change", render);
}

render();
