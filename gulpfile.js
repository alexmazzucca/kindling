var settings = {
	type: '',
	address: '',
	database: '',
	theme: ''
};

/*
* >>========================================>
* Required
* >>========================================>
*/

var gulp = require("gulp");
var git = require('gulp-git');
var rename = require("gulp-rename");
var prompt = require('gulp-prompt');
var notify = require("gulp-notify");
var jsonModify = require("gulp-json-modify");

const del = require("del");

/*
* >>========================================>
* Build Project Directories on Setup
* >>========================================>
*/

function setupInit(cb){
	if(settings.type === 'wordpress'){
		if(settings.theme != '' && settings.database != '' && settings.address != ''){
			return del("./src/*");
		}else{
			console.log(c.bgRed('**ERROR** You must supply theme, database and address to start a WordPress project'));
			process.exit();
		}
	}

	cb();
}

function promptForPackageInfo(cb){
	return gulp.src('./package.json')
		.pipe(prompt.prompt({
			type: 'input',
			name: 'name',
			message: 'Please enter the name of the project...'
		},
		{
			type: 'input',
			name: 'description',
			message: 'Please enter a description of the project...'
		}, function(res){
			renameWorkspaceFile(res.name);
			changePackageName(res.name);
			changePackageDescription(res.description);
			cb();
		}))
		
		.pipe(gulp.dest('./'))
}

function renameWorkspaceFile(packageName){
	return gulp.src('./kindling.code-workspace')
		.pipe(rename(function (path) {
			path.basename = packageName;
		}))
		.pipe(gulp.dest('./'))
}

function changePackageName(packageName){
	return gulp.src('./package.json')
		.pipe(jsonModify({
			key: 'name',
			value: packageName
		}))
		.pipe(gulp.dest('./'))
}

function changePackageDescription(projectDescription){
	return gulp.src('./package.json')
		.pipe(jsonModify({
			key: 'description',
			value: projectDescription
		}))
		.pipe(gulp.dest('./'))
}

const removeWorkspaceFile = () => del(['./kindling.code-workspace']);

function promptForProjectInfo(cb){
	return gulp.src('./package.json')
		.pipe(prompt.prompt([{
			type: 'list',
			name: 'type',
			message: 'Please enter the project type...',
			choices: ['email', 'static', 'wordpress']
		},
		{
			type: 'input',
			name: 'address',
			message: 'Please enter a development URL...'
		},
		{
			type: 'input',
			name: 'database',
			message: 'Please enter a database name...'
		},
		{
			type: 'input',
			name: 'theme',
			message: 'Please enter a theme name...'
		}], function(res){
			changeProjectSettings(res.type, res.address, res.database, res.theme);
			cb();
		}))
}

function changeProjectSettings(projectType, projectAddress, projectDatabase, projectTheme){
	return gulp.src('./.setup/settings.json')
		.pipe(jsonModify(
			{
				key: 'type',
				value: projectType
			},
			{
				key: 'address',
				value: projectAddress
			},
			{
				key: 'database',
				value: projectDatabase
			},
			{
				key: 'theme',
				value: projectTheme
			}
		))
		.pipe(gulp.dest('./'))
		.pipe(function(){
			settings = require('./settings.json')
		})

	// settings.type = projectType;
	// settings.address = projectAddress;
	// settings.database = projectDatabase;
	// settings.theme = projectTheme;
}

function copyTemplateFilesToSrc(){
	return gulp
		.src([
			'./.setup/templates/' + settings.type +  '/**/*',
			'!./.setup/templates/static/robots.txt',
			'!./.setup/templates/static/.htaccess'
		])
		.pipe(gulp.dest('./src/'));
}

function copyTemplateAssetsToSrc(){
	if(settings.type == 'static' || settings.type == 'wordpress'){
		return gulp
			.src([
				'./.setup/templates/scss*/**/*',
				'./.setup/templates/js*/**/*'
			])
			.pipe(gulp.dest('./src/'));
	}
}

function copyTemplateFilesToDist(cb){
	if(settings.type == 'static'){
		return gulp
			.src([
				'./.setup/templates/static/.htaccess',
				'./.setup/templates/static/robots.txt'
			])
			.pipe(gulp.dest('./dist/'));
	}

	cb();
}

function cloneWP(cb){
	if(settings.type == 'wordpress'){
		git.clone('https://github.com/WordPress/WordPress/releases/latest', {args: './dist'}, function(err){
			if(err) throw err;
		});
	}

	cb();
}

function modifyNotificationIcon(cb){
	return gulp
		.src('./.setup/Terminal.icns')
		.pipe(gulp.dest('./node_modules/node-notifier/vendor/mac.noindex/terminal-notifier.app/Contents/Resources/'))

	cb();
}

function updateBuildTasks(cb){
	return gulp
		.src('./.setup/tasks.json')
		.pipe(gulp.dest('./.vscode/'))

	cb();
}

const removeSetupFiles = () => del(['./.setup']);

/*
* >>========================================>
* Setup Tasks
* >>========================================>
*/

const setupProject = gulp.series(
	setupInit,
	promptForPackageInfo,
	removeWorkspaceFile,
	promptForProjectInfo,
	copyTemplateAssetsToSrc,
	copyTemplateFilesToSrc,
	copyTemplateFilesToDist,
	cloneWP,
	modifyNotificationIcon,
	updateBuildTasks,
	removeSetupFiles
);

gulp.task("setup", setupProject);