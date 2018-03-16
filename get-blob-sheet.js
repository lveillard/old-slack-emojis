const request = require('request');
const _ = require('lodash')

const cheerio = require('cheerio');
//const $ = ;


const fetchPage = ()=>{
	return new Promise((resolve, reject)=>{
		request('https://emojipedia.org/google/android-6.0.1', (err, res, body)=>{
			if(err) return reject(err);
			return resolve(body)
		})
	})
}


fetchPage()
	.then((page)=>cheerio.load(page))
	.then(($)=>{
		let emojis = $('ul.emoji-grid li img')
		console.log(emojis[0].attribs);
		console.log(emojis[1].attribs);
		console.log(_.last);

		return _.reduce(emojis, (acc, emoji)=>{
			//console.log(emoji);
			if(emoji.attribs['data-src']) acc[emoji.attribs.title] = emoji.attribs['data-src']
			//acc[emoji.attribs.title] = emoji.attribs.srcset
			return acc;
		}, {})
	})
	.then((emojis)=>{
		console.log(emojis);
	})


// const fetch = async ()=>{

// };

// fetch().then((page)=>console.log(page))