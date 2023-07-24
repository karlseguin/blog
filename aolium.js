const fs = require('fs');
const https = require('https');

function update(aolium) {
	let existing = JSON.parse(fs.readFileSync('src/_data/aolium.json'));
	const added = merge(aolium, existing)

	if (added == null) {
		console.log('0');
		return;
	}

	const merged = added.concat(existing);
	fs.writeFileSync('src/_data/aolium.json', JSON.stringify(existing, null, 2))
	console.log('1');
}

function merge(aolium, existing) {
	const known = {}
	const added = [];
	for (let i = 0; i < existing.length; i++) {
		known[existing[i].id] = true;
	}

	for (let i = 0; i < aolium.length; i++) {
		const a = aolium[i];
		if (known[a.id]) return null;
		added.push(a);
	}
	return added;
}

https.get('https://www.aolium.com/karlseguin.json?html=0', (res) => {
	let body = '';
	res.on('data', (chunk) => body += chunk);
	res.on('end', () => update(JSON.parse(body).posts));
});
