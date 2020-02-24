/*
* >>========================================>
* Settings
* >>========================================>
*/

const settings = {
	type: 'static',
	address: '', // Include 'http://' or 'https://' and trailing slash
	database: '',
	theme: ''
};

/*
* >>========================================>
* Required
* >>========================================>
*/

var gulp = require("gulp");
var browserSync = require("browser-sync").create();
var uglify = require("gulp-uglify");
var concat = require("gulp-concat");
var sass = require("gulp-sass");
var autoprefixer = require("gulp-autoprefixer");
var sourcemaps = require('gulp-sourcemaps');
var prettyHtml = require('gulp-pretty-html');
var inlineCss = require('gulp-inline-css');
var replace = require('gulp-replace');
var rename = require("gulp-rename");
var git = require('gulp-git');
var prompt = require('gulp-prompt');
var cache = require('gulp-cache');
var notify = require("gulp-notify");

const c = require('ansi-colors');
const mysqldump = require('mysqldump')
const htmlmin = require("gulp-htmlmin");
const del = require("del");
const imagemin = require("gulp-imagemin");
const imageminMozjpeg = require('imagemin-mozjpeg');

/*
* >>========================================>
* File Paths
* >>========================================>
*/

var pathToTheme = "";

if(settings.theme != "") {
	pathToTheme = "wp-content/themes/" + settings.theme + '/';
}

const paths = {
	scripts: {
		src: [
			"./node_modules/jquery/dist/jquery.js",
			"./node_modules/gsap/src/uncompressed/TweenMax.js",
			"./src/js/vendor/*.js",
			"./src/js/main.js"
		],
		dest: "./dist/" + pathToTheme + "js/"
	},
	styles: {
		src: [
			"./src/scss/*.scss",
		],
		dest: "./dist/" + pathToTheme + "css/"
	},
	dom: {
		src: [
			"./src/**/*.html",
			"./src/**/*.php"
		],
		dest: "./dist/" + pathToTheme
	},
	images: {
		src: "./src/img/*",
		dest: "./dist/" + pathToTheme + "img/"
	}
};

/*
* >>========================================>
* Database Tasks
* >>========================================>
*/

function backupDatabase(cb){
	if(settings.database != '') {
		var today = new Date(),
			dd = today.getDate(),
			mm = today.getMonth() + 1 //January is 0!
			yyyy = today.getFullYear();
			if(dd<10) { dd = '0'+dd	}
			if(mm<10) { mm = '0'+mm }
			today = '_' + yyyy + '-' + mm + '-' + dd;

		return mysqldump({
			connection: {
				host: 'localhost',
				user: 'root',
				password: 'root',
				database: settings.database
			},
			dump: {
				data: {
					format : false
				}
			},
			dumpToFile: settings.database + today + '.sql'
		});
	}

	cb();
}
 
/*
* >>========================================>
* Script (JS) Tasks
* >>========================================>
*/

function compressScripts(cb) {
	if(settings.type != 'email') {
		return gulp
			.src(paths.scripts.src)
			.pipe(concat("main.js"))
			.pipe(uglify())
			.pipe(notify({
				title: 'JS',
				message: 'Successful compiled'
			}))
			.pipe(gulp.dest(paths.scripts.dest));
	}

	cb();
}

/*
* >>========================================>
* DOM Tasks
* >>========================================>
*/

function compressDOM() {
	if(settings.type == 'email') {
		return gulp
			.src('./src/index.html')
			.pipe(replace('src="', 'src="' + settings.address))
			.pipe(
				htmlmin({
					collapseWhitespace: true,
					conservativeCollapse: true,
					preserveLineBreaks: true,
					removeComments: true,
					keepClosingSlash: true,
					removeEmptyAttributes: false
				})
			)
			.pipe(prettyHtml())
			.pipe(gulp.dest(paths.dom.dest));
	}else{
		return gulp
			.src(paths.dom.src)
			.pipe(
				htmlmin({
					collapseWhitespace: true,
					conservativeCollapse: true,
					preserveLineBreaks: true,
					removeComments: true
				})
			)
			.pipe(gulp.dest(paths.dom.dest));
	}
}

/*
* >>========================================>
* Sass/CSS Tasks
* >>========================================>
*/

function compileCSS(cb) {
	if(settings.type == 'email') {
		return gulp
			.src('./src/scss/email.scss')
			.pipe(sass())
			.on("error", sass.logError)
			.pipe(gulp.dest(paths.styles.dest))
			.pipe(browserSync.stream());
	}else{
		return gulp
			.src(paths.styles.src)
			.pipe(sourcemaps.init())
			.pipe(
				sass({
					outputStyle: "compressed"
				})
			)
			.on("error", sass.logError)
			.pipe(autoprefixer())
			.pipe(sourcemaps.write('.'))
			.pipe(rename(
				function(path){
					path.suffix += ".min";

					if(pathToTheme === '') {
						path.dirname += paths.styles.dest;
					}else{
						path.dirname += "./dist/" + pathToTheme;
						path.basename = "style";
					}
				}
			))
			.pipe(notify({
				title: 'SASS',
				message: 'Successful compiled'
			}))
			.pipe(gulp.dest("./dist"))
			.pipe(browserSync.stream());
	}

	cb();
}

function inlineCSS(cb) {
	if(settings.type == 'email') {
		return gulp
			.src('./dist/index.html')
			.pipe(inlineCss({
				applyStyleTags: true,
				applyLinkTags: true,
				removeStyleTags: true,
				removeLinkTags: true,
				removeHtmlSelectors: true,
				xmlMode: true,
			}))
			.pipe(gulp.dest(paths.dom.dest))
	}

	cb();
}

function deleteCSSDir(cb) {
	if(settings.type === 'email') {
		return del(paths.styles.dest);
	}

	cb();
}

/*
* >>========================================>
* Image Tasks
* >>========================================>
*/

function compressImages(cb) {
	return gulp
		.src(paths.images.src)
		.pipe(cache(imagemin([
			imageminMozjpeg({quality: 85}),
			imagemin.optipng({optimizationLevel: 5})
		], {
			verbose: true
		})))
		.pipe(notify({
			title: 'Images',
			message: 'Successful compression'
		}))
		.pipe(gulp.dest(paths.images.dest));

	cb();
}

/*
* >>========================================>
* Start Server and Live Reload
* >>========================================>
*/

function startServer(cb) {
	if(settings.address === '' || settings.type == 'email') {
		browserSync.init({
			server: {
				baseDir: "./dist/"
			}
		});
	}else{
		browserSync.init({
			proxy: settings.address
		});
	}
	
	cb();
}

/*
* >>========================================>
* Watch Folders for Changes
* >>========================================>
*/

function watchForChanges() {
	gulp.watch(paths.scripts.src, gulp.series(compressScripts, liveReload));
	gulp.watch(paths.styles.src, gulp.series(compileCSS));
	gulp.watch(paths.dom.src, gulp.series(compressDOM, liveReload));
	gulp.watch(paths.images.src, gulp.series(compressImages, liveReload));
}

function liveReload(cb) {
	browserSync.reload();
	cb();
}

/*
* >>========================================>
* Git Commit & Push
* >>========================================>
*/

// function gitInit(cb){
// 	git.init(function (err) {
// 		if (err) throw err;
// 		cb();
// 	});
// }

// function gitCommit(cb){
// 	return gulp.src('./')
// 		.pipe(prompt.prompt({
// 			type: 'input',
// 			name: 'commit',
// 			message: 'Please enter commit message...'
// 		}, function(res){
// 			return gulp.src('./')
// 				.pipe(git.add())
// 				.pipe(git.commit(res.commit));
// 			cb();
// 		}));
// }

// function gitPush(cb){
// 	git.push('origin', 'master', function (err) {
// 		if (err) throw err;
// 	});
// 	cb();
// }

/*
* >>========================================>
* Build Project Directories on Setup
* >>========================================>
*/

const resetDist = () => del("./dist");

function resetSrc(cb){
	if(settings.type === 'wordpress'){
		if(settings.theme != '' && settings.database != '' && settings.address != ''){
			return del("./src/*");
		}else{
			console.log(c.bgRed('**ERROR** You must supply theme, database and address to start a WordPress project'));
			process.exit();
		}
	}else{
		return del("./src/*");
	}
}

exports.default = resetSrc;

function copyTemplateFilesToSrc(){
	return gulp
		.src([
			'./templates/' + settings.type +  '/**',
			'!./templates/static/robots.txt',
			'!./templates/static/.htaccess'
		])
		.pipe(gulp.dest('./src/'));
}

function copyTemplateFilesToDist(cb){
	if(settings.type == 'static'){
		return gulp
			.src([
				'./templates/static/.htaccess',
				'./templates/static/robots.txt'
			])
			.pipe(gulp.dest('./dist/'));
	}

	cb();
}

function cloneWP(cb){
	if(settings.type == 'wordpress'){
		git.clone('https://github.com/WordPress/WordPress', {args: './dist'}, function(err){
			if(err) throw err;
		});
	}

	cb();
}

function otherSetupTasks(cb){
	if(settings.type == 'static'){
		return gulp
			.src('./setup/Terminal.icns')
			.pipe(gulp.dest('./node_modules/node-notifier/vendor/mac.noindex/terminal-notifier.app/Contents/Resources/'))
	}

	cb();
}

const setupComplete = () => del("./setup");

/*
* >>========================================>
* Setup Tasks
* >>========================================>
*/

const setupProject = gulp.series(
	resetSrc,
	resetDist,
	copyTemplateFilesToSrc,
	copyTemplateFilesToDist,
	cloneWP,
	otherSetupTasks,
	setupComplete
);

gulp.task("setup", setupProject);

/*
* >>========================================>
* Build Tasks
* >>========================================>
*/

const buildTasks = gulp.series(
	gulp.parallel(
		compressScripts,
		compileCSS,
		compressDOM,
		compressImages
	),
	inlineCSS,
	deleteCSSDir
);

gulp.task("build", buildTasks);

/*
* >>========================================>
* Server Tasks
* >>========================================>
*/

const serverTasks = gulp.series(
	startServer,
	compressScripts,
	compileCSS,
	compressDOM,
	compressImages,
	watchForChanges
);

gulp.task("serve", serverTasks);

/*
* >>========================================>
* Database Tasks
* >>========================================>
*/

const databaseTasks = gulp.series(
	backupDatabase
);

gulp.task("database", databaseTasks);

/*
* >>========================================>
* Git Commit Tasks
* >>========================================>
*/

// const syncTasks = gulp.series(
// 	backupDatabase,
// 	gitInit,
// 	gitCommit,
// 	gitPush
// );

// gulp.task("sync", syncTasks);