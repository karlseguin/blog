const h = require("@11ty/eleventy-plugin-syntaxhighlight");
const rss = require("@11ty/eleventy-plugin-rss");

const ROOT_URL = 'https://www.openmymind.net';

module.exports = function(config) {
	config.addPlugin(h, {});
	config.addPlugin(rss, {
		posthtmlRenderOptions: {
			closingSingleTag: 'default'
		}
	});

	config.addNunjucksGlobal('feed_posts', function(all, aolium) {
		let local = all.filter((p) => p.data.title).reverse().slice(0, 1).map((p) => {
			let content = p.template.frontMatter.content;
			content = content.replace(/\s*{%\s*endhighlight\s*%}/g, '</code></pre>').replace(/\s*{%\s*highlight\s*.*?%}/g, '<pre><code>');
			return {
				url: p.url,
				title: p.data.title,
				date: p.date,
				content: content,
				root: ROOT_URL,
				url: ROOT_URL + p.url,
			};
		});

		return local.concat(aolium).sort((a, b) => b.date - a.date).slice(0, 20);
	});

	config.addFilter('public', function(posts) {
		const p = posts.filter((p) => p.data.title);
		return p;
	});

	config.addFilter('last_updated', function(posts) {
		return posts[0].data.date;
	});

	config.addFilter('plainHighlight', function(value) {
		return value;
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
