const request = require('request');
const fs = require('fs-extra');
const _ = require('lodash');

const cheerio = require('cheerio');
const gm = require('gm').subClass({imageMagick: true});
const http = require('http');

const downloadImages = async (url, dir)=>{
	let count =0;
	console.log('Fetching page', url);
	fs.ensureDirSync(dir);
	const page = await new Promise((resolve, reject)=>{
		request(url, (err, res, body)=>{
			if(err) return reject(err);
			console.log('Fetched page');
			return resolve(body);
		})
	})
	const $ = cheerio.load(page);
	const elements = Array.prototype.slice.call($('ul.emoji-grid li img'));
	const emojis = elements.map((emoji, idx)=>{
		const src = emoji.attribs['data-src'] || emoji.attribs['data-cfsrc'];
		let code = src.substring(src.lastIndexOf('_')+1).replace('.png', '').toUpperCase();
		if(code.split('-')[0].length == 2) code = `00${code}`;
		return {
			title : emoji.attribs.title,
			src,
			code,
			path : `${dir}/${code}.png`
		}
	});

	console.log('Downloading Images', Object.keys(emojis).length);
	const download = async (url, dest)=>{
		return new Promise((resolve, reject)=>{
			request(url).pipe(fs.createWriteStream(dest)).on('finish', ()=>{
				gm(dest)
					.gravity('Center')
					.resize(64, 64)
					.write(dest, (err)=>err?reject(err):resolve());
			})
		});
	};

	await _.chunk(emojis, 200).reduce((prom, chunk)=>{
		return prom.then(()=>Promise.all(chunk.map((emoji)=>download(emoji.src, emoji.path))))
	}, Promise.resolve())
	return emojis;
};


const makeSheet = (EmojiList)=>{
	const chunks = _.chunk(EmojiList, 500);
	const finalPath = '../blob_sprite_64.png'
	const compose = (emojis, idx)=>{
		console.log('composing', `${idx}/${chunks.length-1}`);
		return new Promise((resolve, reject)=>{
			let cmd = gm()
				.in("-background")
				.in('none')
			if(idx != 0) cmd.in('-page', '+0+0').in(finalPath);
			emojis.reduce((img, emoji)=>{
				return img
					.in('-page', `64x64+${emoji.sheet_x * 64}+${emoji.sheet_y * 64}`)
					.in(emoji.path)
			}, cmd);
			cmd
				.mosaic()
				.write(finalPath, (err)=>err?reject(err):resolve());
		});
	}
	return chunks.reduce((prom, emojis, idx)=>prom.then(()=>compose(emojis, idx)), Promise.resolve())
};

const sanatizeEmojiData = (blobs, fallback)=>{
	const EmojiData = require('./iamcal-emoji-data.json');
	const sliceEmojiData = (emoji)=>{
		let result = _.find(blobs, (blob)=>emoji.unified == blob.code || emoji.non_qualified == blob.code)
		if(!result) result = _.find(fallback, (fb)=>emoji.unified == fb.code || emoji.non_qualified == fb.code);
		if(!result) return false;
		return {
			code    : result.code,
			path    : result.path,
			sheet_x : emoji.sheet_x,
			sheet_y : emoji.sheet_y
		}
	}
	return EmojiData.reduce((data, emoji)=>{
		if(typeof emoji.sheet_x !== 'undefined') data.push(sliceEmojiData(emoji))
		if(emoji.skin_variations) data = data.concat(Object.values(emoji.skin_variations).map(sliceEmojiData))
		return data;
	}, []);
};

const run = async ()=>{
	try{
		let blobs = require('./temp_imgs/blobs');
		console.log('Loaded Blobs');
	}catch(err){
		blobs = await downloadImages('https://emojipedia.org/google/android-6.0.1', 'temp_imgs/blobs');
		fs.outputJsonSync('temp_imgs/blobs/index.js', blobs, {spaces : 2});
	}
	try{
		let fallback = require('./temp_imgs/google');
		console.log('Loaded fallback');
	}catch(err){
		fallback = await downloadImages('https://emojipedia.org/google/android-8.1/', 'temp_imgs/google');
		fs.outputJsonSync('temp_imgs/google/index.js', fallback, {spaces : 2});
	}
	const data = _.filter(sanatizeEmojiData(blobs, fallback));
	await makeSheet(data);
	console.log('done');
};

run().catch((err)=>console.log(err))