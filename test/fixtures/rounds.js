/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

const randomstring = require('randomstring');
const stampit = require('stampit');
const faker = require('faker');

const rounds = {};

const Round = stampit({
	props: {
		address: '',
		amount: null,
		delegatePublicKey: '',
		round: null,
	},
	init({ address, amount, delegatePublicKey, round }) {
		this.address =
			address ||
			`${randomstring.generate({ charset: 'numeric', length: 20 })}L`;
		this.amount =
			amount || faker.random.number({ min: 1000, max: 5000 }).toString();
		this.delegatePublicKey =
			delegatePublicKey ||
			randomstring.generate({
				charset: 'hex',
				length: 32,
				capitalization: 'lowercase',
			});
		this.round = round || faker.random.number({ min: 10, max: 500 });
	},
});

// Results from Lisk-Core 0.9.3 (after genesis block insertion)
rounds.delegatesOrderAfterGenesisBlock = [
	'948b8b509579306694c00833ec1c0f81e964487db2206ddb1517bfeca2b0dc1b',
	'f25af3c59ac7f5155c7a9f36762bd941b9dc9c5c051a1bc2d4e34ed773dd04a3',
	'74583aba9c0b92e4f08c8c75e6df341c255ca007971195ff64d6f909dc4b7177',
	'27f43391cca75cbc82d1750307649508d1d318cd015f1f172b97318f17ab954e',
	'6fb2e0882cd9d895e1e441b9f9be7f98e877aa0a16ae230ee5caceb7a1b896ae',
	'b5341e839b25c4cc2aaf421704c0fb6ba987d537678e23e45d3ca32454a2908c',
	'6d462852d410e84ca199a34d7ccad443784471f22cf3de37c531ce3b87ebbc41',
	'c4dfedeb4f639f749e498a2307f1545ddd6bda62e5503ac1832b122c4a5aedf9',
	'a50a55d4476bb118ba5121a07b51c185a8fe0a92b65840143b006b9820124df4',
	'1e82c7db09da2010e7f5fef24d83bc46238a20ef7ecdf12d9f32e4318a818777',
	'd8daea40fd098d4d546aa76b8e006ce4368c052ffe2c26b6eb843e925d54a408',
	'64db2bce729e302f6021047dfd39b6c53caf83b42da4b5b881cb153a3fb31613',
	'4bde949c19a0803631768148019473929b5f8661e9e48efb8d895efa9dd24aef',
	'5f6cc5a8aac752d37c676b0d46a798f7625e37dfa1e96091983274e04ab7ffe2',
	'03e811dda4f51323ac712cd12299410830d655ddffb104f2c9974d90bf8c583a',
	'9986cedd4b5a28e4c81d9b4bff0461dddaa25099df00b8632fe99e88df28ce73',
	'3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
	'3ea481498521e9fb1201b2295d0e9afa826ac6a3ef51de2f00365f915ac7ac06',
	'f9f6ff873c10c24eba834be28a56415a49c9c67b7c0ee9f106da827847168986',
	'0186d6cbee0c9b1a9783e7202f57fc234b1d98197ada1cc29cfbdf697a636ef1',
	'f62062b7590d46f382fb8c37a26ab0a1bd512951777aedcaa96822230727d3a1',
	'f827f60366fae9f9ed65384979de780f4a18c6dbfbefb1c7d100957dde51a06d',
	'07935c642c7409c365258c8488760e96a851cee618aec72eeeb135c9c827f0f9',
	'640dfec4541daed209a455577d7ba519ad92b18692edd9ae71d1a02958f47b1b',
	'e818ac2e8e9ffacd2d49f0f2f6739e16711644194d10bb1a8e9e434603125fa1',
	'bf9f5cfc548d29983cc0dfa5c4ec47c66c31df0f87aa669869678996902ab47f',
	'01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398db746',
	'904c294899819cce0283d8d351cb10febfa0e9f0acd90a820ec8eb90a7084c37',
	'a10f963752b3a44702dfa48b429ac742bea94d97849b1180a36750df3a783621',
	'8a0bcba8e909036b7a0fdb244f049d847b117d871d203ef7cc4c3917c94fd5fd',
	'fc8672466cc16688b5e239a784cd0e4c0acf214af039d9b2bf7a006da4043883',
	'6e904b2f678eb3b6c3042acb188a607d903d441d61508d047fe36b3c982995c8',
	'910da2a8e20f25ccbcb029fdcafd369b43d75e5bc4dc6d92352c29404acc350f',
	'ba7acc3bcbd47dbf13d744e57f696341c260ce2ea8f332919f18cb543b1f3fc7',
	'31402977c7eaf9e38d18d0689a45d719d615de941f7e80f6db388453b46f4df5',
	'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
	'19ffdf99dee16e4be2db4b0e000b56ab3a4e10bee9f457d8988f75ff7a79fc00',
	'6f04988de7e63537c8f14e84b0eb51e0ea9c5da8b4b9256243b3e40b1aeccb76',
	'da673805f349faf9ca1db167cb941b27f4517a36d23b3c21da4159cff0045fbe',
	'68680ca0bcd4676489976837edeac305c34f652e970386013ef26e67589a2516',
	'e13a0267444e026fe755ec128858bf3c519864631e0e4c474ba33f2470a18b83',
	'96c16a6251e1b9a8c918d5821a5aa8dfb9385607258338297221c5a226eca5c6',
	'f7b9751d59dd6be6029aa36a81a3f6436e2970cf4348845ab6254678fb946c18',
	'2f9b9a43b915bb8dcea45ea3b8552ebec202eb196a7889c2495d948e15f4a724',
	'73fec19d4bfe361c0680a7cfd24b3f744a1c1b29d932c4d89ce6157679f8af7d',
	'85b07e51ffe528f272b7eb734d0496158f2b0f890155ebe59ba2989a8ccc9a49',
	'526931663cbee883ff22369172cba091a5dd5fa1200284fa790d7aeca53d37af',
	'b137de324fcc79dd1a21ae39a2ee8eed05e76b86d8e89d378f8bb766afb8719f',
	'c3d1bc76dea367512df3832c437c7b2c95508e140f655425a733090da86fb82d',
	'86499879448d1b0215d59cbf078836e3d7d9d2782d56a2274a568761bff36f19',
	'55405aed8c3a1eabe678be3ad4d36043d6ef8e637d213b84ee703d87f6b250ed',
	'9a7452495138cf7cf5a1564c3ef16b186dd8ab4f96423f160e22a3aec6eb614f',
	'e42bfabc4a61f02131760af5f2fa0311007932a819a508da25f2ce6af2468156',
	'141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
	'9f2fcc688518324273da230afff9756312bf23592174896fab669c2d78b1533c',
	'47c8b3d6a9e418f0920ef58383260bcd04799db150612d4ff6eb399bcd07f216',
	'5c4af5cb0c1c92df2ed4feeb9751e54e951f9d3f77196511f13e636cf6064e74',
	'd3e3c8348bca51461eabfc382f8a01e8e284db54104ad37ec0695d48ae5531ac',
	'cf8a3bf23d1936a34facc4ff63d86d21cc2e1ac17e0010035dc3ef7ae85010dc',
	'9a0f19e60581003b70291cf4a874e8217b04871e676b2c53c85a18ab95c2683b',
	'aa33af13b440746b4f24312cba5fa910eb077ce6b16b84ebb482cb7720b5c686',
	'0779ca873bbda77f2850965c8a3a3d40a6ee4ec56af55f0a3f16c7c34c0f298b',
	'9c16751dbe57f4dff7b3fb8911a62c0cb2bdee6240e3f3fefe76832788cb14c6',
	'94b163c5a5ad346db1c84edaff51604164476cf78b8834b6b610dd03bd6b65d9',
	'a10ed9c59dac2c4b8264dc34f2d318719fb5f20ecdd8d6be2d7abfe32294f20d',
	'f33f93aa1f3ddcfd4e42d3206ddaab966f7f1b6672e5096d6da6adefd38edc67',
	'1cc68fa0b12521158e09779fd5978ccc0ac26bf99320e00a9549b542dd9ada16',
	'e6d075e3e396673c853210f74f8fe6db5e814c304bb9cd7f362018881a21f76c',
	'eabfe7093ef2394deb1b84287f2ceb1b55fe638edc3358a28fc74f64b3498094',
	'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	'76c9494237e608d43fd6fb0114106a7517f5503cf79d7482db58a02304339b6c',
	'399a7d14610c4da8800ed929fc6a05133deb8fbac8403dec93226e96fa7590ee',
	'9503d36c0810f9ac1a9d7d45bf778387a2baab151a45d77ac1289fbe29abb18f',
	'031e27beab583e2c94cb3167d128fc1a356c1ae88adfcfaa2334abffa3ae0b4c',
	'ba2ea5e324eeb42fa6f4d1132a1d79911721e8507033bb0abd49715f531877b4',
	'cdd68a321ea737e82bce23d2208040f79471d36f2e6f84c74ea36ab26245e522',
	'95ea7eb026e250741be85e3593166ef0c4cb3a6eb9114dba8f0974987f10403f',
	'd1c3a2cb254554971db289b917a665b5c547617d6fd20c2d6051bc5dfc805b34',
	'b6ac700bf890b887e218dbd55b8f6b091dfc5a684d0fd7a6f69db7dc0313b51b',
	'c61d0822bbdbfe2a0b5503daff0ce8441c623115c94c0cfcf047a51f8b7160d3',
	'4fe5cd087a319956ddc05725651e56486961b7d5733ecd23e26e463bf9253bb5',
	'edbb9828fbe62da2a59afbc8623e8ebc5ed2f9b7f77a0cd1cdcf55edea30521c',
	'2b6f49383af36fd9f1a72d5d2708c8c354add89aaea7edc702c420e2d5fdf22e',
	'db821a4f828db977c6a8d186cc4a44280a6ef6f54ac18ec9eb32f78735f38683',
	'1b5a93c7622c666b0228236a70ee1a31407828b71bfb6daaa29a1509e87d4d3c',
	'b00269bd169f0f89bd2f278788616521dd1539868ced5a63b652208a04ee1556',
	'1af35b29ca515ff5b805a5e3a0ab8c518915b780d5988e76b0672a71b5a3be02',
	'3476bba16437ee0e04a29daa34d753139fbcfc14152372d7be5b7c75d51bac6c',
	'82174ee408161186e650427032f4cfb2496f429b4157da78888cbcea39c387fc',
	'a796e9c0516a40ccd0eee7a32fdc2dc297fee40a9c76fef9c1bb0cf41ae69750',
	'47b9b07df72d38c19867c6a8c12429e6b8e4d2be48b27cd407da590c7a2af0dc',
	'386217d98eee87268a54d2d76ce9e801ac86271284d793154989e37cb31bcd0e',
	'62bbb3c41e43df73de2c3f87e6577d095b84cf6deb1b2d6e87612a9156b980f8',
	'6164b0cc68f8de44cde90c78e838b9ee1d6041fa61cf0cfbd834d76bb369a10e',
	'1e6ce18addd973ad432f05f16a4c86372eaca054cbdbcaf1169ad6df033f6b85',
	'644a971f2c0d0d4b657d050fca27e5f9265e3dfa02a71f7fbf834cc2f2a6a4c8',
	'5d28e992b80172f38d3a2f9592cad740fd18d3c2e187745cd5f7badf285ed819',
	'67651d29dc8d94bcb1174d5bd602762850a89850503b01a5ffde3b726b43d3d2',
	'3be2eb47134d5158e5f7d52076b624b76744b3fba8aa50791b46ba21408524c9',
	'fab7b58be4c1e9542c342023b52e9d359ea89a3af34440bdb97318273e8555f0',
	'19d55c023d85d6061d1e196fa440a50907878e2d425bcd893366fa04bc23b4de',
];

module.exports = {
	Round,
	rounds,
};
