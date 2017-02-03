#!/usr/bin/env node

const meow = require("meow");
const hljs = require("highlight.js");
const iterator = require("markdown-it-for-inline");
const transformer = require("./markdown-headings");
const kebab = require("lodash.kebabcase");
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
  // console.log(tokens[idx]);
  // console.log(tokens[idx + 1]);
  // console.log(tokens[idx + 2]);
  tokens[idx].attrPush([ "target", "_blank" ]);
}).use(transformer, function(tokens, idx) {
  const children = tokens[idx + 1];
  const id = kebab(children.content);
  children.children.unshift(
    {
      type: "link_open",
      tag: "a",
      attrs: [ [ "href", `#${id}` ] ],
      map: null,
      nesting: 1,
      level: 1,
      children: null,
      content: "§",
      markup: "§",
      info: "",
      meta: null,
      block: false,
      hidden: false
    },
    {
      type: "text",
      tag: "",
      attrs: null,
      map: null,
      nesting: 0,
      level: 1,
      children: null,
      content: "§",
      markup: "",
      info: "",
      meta: null,
      block: false,
      hidden: false
    },
    {
      type: "link_close",
      tag: "a",
      attrs: null,
      map: null,
      nesting: -1,
      level: 0,
      children: null,
      content: "",
      markup: "",
      info: "",
      meta: null,
      block: false,
      hidden: false
    }
  );
  tokens[idx].attrPush([ "id", id ]);
}).use(require("markdown-it-container"), "small", {
  marker: "§",
  validate: str => true,
  render: function(tokens, idx) {
    const block = tokens[idx];
    if (block.nesting === 1) {
      var m = tokens[idx].info.trim().replace("§§§", "");
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
        --config, -c The config to merge with below options
        --template, -t  The template flags.file to use (must be mustache)
        --watch, -w  Watch flags.files for changes
        --stdout, -s  Output the html to stdout
        --output, -o  The .html flags.file name (will be written to if stdout not specified)
        --title, -t  The title for the html flags.file (filename used instead)

        Example
        $ simple-blog my-amazing-post.md
        $ simple-blog --watch --template main.mustache my-amazing-post.md
        `
);

const [ file ] = cli.input;
const config = cli.flags.c || cli.flags.config;
const flags = Object.assign(
  {},
  cli.flags,
  { file },
  config ? require(`${process.cwd()}/${config}`) : undefined
);

if (!flags.file) cli.showHelp(1);

const render = () => {
  const templateContent = hbs.compile(
    readFileSync(flags.template || __dirname + "/template.hbs").toString()
  );
  const content = readFileSync(flags.file);
  const post = markdown.render(content.toString());
  const html = templateContent({
    content: post,
    title: flags.title || flags.t || flags.file
  });

  if (flags.stdout || flags.s) {
    console.log(html);
  } else {
    const outputFile = flags.output ||
      flags.o ||
      flags.file.replace(".md", ".html");
    writeFileSync(outputFile, html);
    console.log(`Wrote to flags.file: ${outputFile}`);
  }
};

if (flags.watch !== undefined) {
  let pathToWatch = [
    typeof flags.watch === "string" ? flags.watch : flags.file
  ];
  if (flags.template) {
    pathToWatch = pathToWatch.concat(flags.template);
  }
  console.log(`Watching: ${pathToWatch}`);
  chokidar.watch(pathToWatch).on("change", render);
}

render();
