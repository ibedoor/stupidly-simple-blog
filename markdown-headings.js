'use strict';


module.exports = function for_inline_plugin(md, transformer) {

  function scan(state) {
    var i, blkIdx, inlineTokens;

    for (blkIdx = state.tokens.length - 1; blkIdx >= 0; blkIdx--) {
      if (state.tokens[blkIdx].type === 'heading_open') {
        transformer(state.tokens, blkIdx);
      }
    }
  }

  md.core.ruler.push("markdown_headings", scan);
}
