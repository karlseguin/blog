const MarkdownIt = require('markdown-it');
const EleventyFetch = require('@11ty/eleventy-fetch');

const ROOT_URL = 'https://www.aolium.com/karlseguin';

module.exports = async function() {
	let json = await EleventyFetch(ROOT_URL + ".json?html=0", {
		duration: `1d`, // 1 day
		type: `json` // also supports "text" or "buffer"
	});

	const md = new MarkdownIt();
	return json.posts.map((a) => {
		return {
			root: ROOT_URL,
			url: `${ROOT_URL}/${a.id}`,
			title: a.title || a.text.substr(0, 80),
			date: new Date(a.created * 1000),
			content: md.render(a.text),
		};
	});
};
