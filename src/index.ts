import * as fs from "fs";
import * as path from "path";
import * as url from "url";
import * as Chrome from "chrome-launcher";
import CDP from "chrome-remote-interface";
import cheerio from "cheerio";
import fetch from "node-fetch";
import formdata from "formdata-node";


const SEARCH_BY_FILE_URI = "https://www.google.com/searchbyimage/upload";
const SEARCH_BY_URL_URI = "https://www.google.com/searchbyimage";


export interface SearchResult {
	image: string;
	page: string;
	width: number;
	height: number;
}


async function start() {
	const chrome = await Chrome.launch({ chromeFlags: ["--disable-gpu"] });
	console.log(chrome.port);
}


export class GRIS {
	private chrome: Chrome.LaunchedChrome;
	private protocol: any;
	private page: any;
	private DOM: any;

	public ready: Promise<GRIS>;

	constructor() {
		this.ready = Chrome.launch({ chromeFlags: ["--disable-gpu", "--headless"] })
			.then(async (chrome) => {
				this.chrome = chrome;
				this.protocol = await CDP({ port: chrome.port });
				const { Page, DOM } = this.protocol;
				this.page = Page;
				this.DOM = DOM;

				return Promise.all([
					Page.enable(),
					DOM.enable(),
				]).then(() => this);
			});
	}

	private async getResultUrlByFile(imagePath: string): Promise<string | void> {
		const filePath = path.resolve(imagePath);
		if (!fs.existsSync(filePath)) {
			return;
		}
		const stream = fs.createReadStream(filePath);
		const data = new formdata();

		data.append("encoded_image", stream, path.basename(filePath));
		data.append("image_content", "");

		const response = await fetch(SEARCH_BY_FILE_URI, {
			method: "post",
			redirect: "manual",
			headers: data.headers,
			body: data.stream,
		});
		if (response.status !== 302) {
			return;
		}

		return response.headers.get("location") as string;
	}

	private async getResultUrlByUrl(url: string): Promise<string | void> {
		const uri = new URL(SEARCH_BY_URL_URI);
		uri.searchParams.append("image_url", url);
		uri.searchParams.append("encoded_image", "");
		uri.searchParams.append("image_content", "");
		uri.searchParams.append("filename", "");

		const response = await fetch(uri.toString(), { redirect: "manual" });
		if (response.status !== 302) {
			return;
		}
		return response.headers.get("location") as string;
	}

	private parsePage(page: string): SearchResult[] {
		const results: SearchResult[] = [];
		const $ = cheerio.load(page);

		$(".g .rc").each((i, el) => {
			const imageLink = $(el).find(".s .th a").attr("href");
			if (imageLink) {
				const imageObj = new URL(imageLink, SEARCH_BY_FILE_URI);
				const image: string = imageObj.searchParams.get("imgurl") as string;
				const page: string = imageObj.searchParams.get("imgrefurl") as string;
				const width: number = parseInt(imageObj.searchParams.get("w") as string);
				const height: number = parseInt(imageObj.searchParams.get("h") as string);
				results.push({ image, page, width, height });
			}
		});
		return results;
	}

	public kill(): Promise<void> {
		return Promise.all([
			this.protocol.close(),
			this.chrome.kill(),
		]).then(() => {});
	}

	public async searchByFile(imagePath: string, page: number = 0): Promise<SearchResult[]> {
		const url = await this.getResultUrlByFile(imagePath);

		if (!url) {
			return [];
		}

		const urlObj = new URL(url);
		urlObj.searchParams.append("start", (page * 10).toString());

		this.page.navigate({ url: urlObj.toString() });
		await this.page.loadEventFired();

		const root = await this.DOM.getDocument({ depth: -1 });
		const source = await this.DOM.getOuterHTML({ nodeId: root.root.nodeId });

		return this.parsePage(source.outerHTML);
	}

	public async searchByUrl(url: string, page: number = 0): Promise<SearchResult[]> {
		const uri = await this.getResultUrlByUrl(url);

		if (!uri) {
			return [];
		}

		const urlObj = new URL(uri);
		urlObj.searchParams.append("start", (page * 10).toString());

		this.page.navigate({ url: urlObj.toString() });
		await this.page.loadEventFired();

		const root = await this.DOM.getDocument({ depth: -1 });
		const source = await this.DOM.getOuterHTML({ nodeId: root.root.nodeId });

		return this.parsePage(source.outerHTML);
	}
}
