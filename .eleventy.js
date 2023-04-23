const h = require("@11ty/eleventy-plugin-syntaxhighlight");
const rss = require("@11ty/eleventy-plugin-rss");

module.exports = function(config) {
	config.addPlugin(h, {});
	config.addPlugin(rss, {
		posthtmlRenderOptions: {
			closingSingleTag: 'default'
		}
	});

	config.addFilter('public', function(posts) {
		const p = posts.filter((p) => p.data.title );
		return p;
	});


	config.addFilter('last_updated', function(posts) {
		return posts[0].data.date;
	});

	config.addFilter('plainHighlight', function(value) {
		return value.replace(/\s*{%\s*endhighlight\s*%}/g, '</pre>').
			replace(/\s*{%\s*highlight\s*.*?%}/g, '<pre>');
	});

	config.addPassthroughCopy('assets');
	config.addPassthroughCopy('404.html');
	config.addPassthroughCopy('favicon.ico');
	config.addPassthroughCopy('apple-touch-icon.png');

	return {
		dir: {
			input: 'src'
		}
	}
};
