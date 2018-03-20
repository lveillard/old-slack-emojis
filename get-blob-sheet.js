const request = require('request');
const _ = require('lodash')

const cheerio = require('cheerio');

const fs = require('fs');

const fetchPage = async ()=>{
	return new Promise((resolve, reject)=>{
		request('https://emojipedia.org/google/android-6.0.1', (err, res, body)=>{
			if(err) return reject(err);
			console.log('Fetched page');
			return resolve(body);
		})
	})
};

const parseEmojis = (page)=>{
	const $ = cheerio.load(page);
	const emojis = Array.prototype.slice.call($('ul.emoji-grid li img'));
	return emojis.map((emoji)=>{
		const src = emoji.attribs['data-src'] || emoji.attribs['data-cfsrc'];
		return {
			title : emoji.attribs.title,
			src,
			code : src.substring(src.lastIndexOf('_')+1).replace('.png', '').toUpperCase()
		}
	});
};

const EmojiData = require('./iamcal-emoji-data.json');
const addSheetPos = (emojis)=>{
	return emojis.map((emoji)=>{
		const data = EmojiData.find((ed)=>(ed.unified == emoji.code || ed.non_qualified == emoji.code));
		if(data) emoji.sheet = {x : data.sheet_x, y : data.sheet_y}
		return emoji;
	});
};

const run = async ()=>{
	//const page = await fetchPage();
	const page = fs.readFileSync('./emojipage.html', 'utf8');
	let emojis = parseEmojis(page);
	emojis = addSheetPos(emojis);

	fs.writeFileSync('./temp.json', JSON.stringify(emojis, null, '\t'), 'utf8');

}

run();