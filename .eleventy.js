const dayjs = require('dayjs');
const Markdown = require('markdown-it');
const rss = require('@11ty/eleventy-plugin-rss');
const h = require('@11ty/eleventy-plugin-syntaxhighlight');

const ROOT_URL = 'https://www.openmymind.net';

module.exports = function(config) {
	config.addPlugin(h, {});
	config.addPlugin(rss, {
		posthtmlRenderOptions: {
			closingSingleTag: 'default'
		}
	});

	config.addNunjucksGlobal('all_posts', function(local) {
		const md = new Markdown();
		local = local.filter((p) => p.data.title && p.data.hidden !== true).reverse().map((p) => {
			let content = p.rawInput;
			content = content.replace(/\s*{%\s*endhighlight\s*%}/g, '</code></pre>').replace(/\s*{%\s*highlight\s*.*?%}/g, '<pre><code>');
			return {
				url: p.url,
				inline: false,
				title: p.data.title,
				date: p.date,
				content: content,
				root: ROOT_URL,
				type: 'blog',
				url: p.url,
			};
		});

		return local.sort((a, b) => b.date - a.date);
	});

	config.addFilter('public', function(posts) {
		const p = posts.filter((p) => p.data.title);
		return p;
	});

	config.addFilter('last_updated', function(posts) {
		return posts[0].data.date;
	});

	config.addFilter('post_date', function(d) {
		return dayjs(d).format('MMM DD YYYY');
	});

	config.addFilter('extract_domain', function(url) {
		const u = new URL(url)
		const host = u.hostname;
		return host.startsWith('www.') ? host.substring(4) : host;
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
