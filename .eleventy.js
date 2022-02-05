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
		return posts.filter((p) => p.data.title );
	});

	config.addFilter('last_updated', function(posts) {
		return posts[0].data.date;
	});

	config.addPassthroughCopy('assets');
	config.addPassthroughCopy('404.html');
	config.addPassthroughCopy('favicon.ico');

	return {
		dir: {
			input: 'src'
		}
	}
};
