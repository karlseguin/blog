module.exports = {
	permalink: data => {
		if (data.permalink) return data.permalink;
		const slug = data.page.fileSlug;
		const match = slug.match(/\d{4}\-\d{1,2}\-\d{1,2}\-/);
		const link =  !match ? slug : slug.replace(match[0], '');
		return link + '/';
	}
}
