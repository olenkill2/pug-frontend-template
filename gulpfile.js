var gulp             = require('gulp'),
	sass             = require('gulp-sass');
	browserSync      = require('browser-sync'),
	concat           = require('gulp-concat'),
	uglify           = require('gulp-uglify')
	cssnano          = require('gulp-cssnano'),
	rename           = require('gulp-rename'),
	del              = require('del'),
	imagemin         = require('gulp-imagemin'),
	image            = require('gulp-image'),
	pngquant         = require('imagemin-pngquant'),
	cache            = require('gulp-cache'),
	autoprefixer     = require('gulp-autoprefixer'),
	babel            = require('gulp-babel'),
	imageminZopfli   = require('imagemin-zopfli'),
	imageminMozjpeg  = require('imagemin-mozjpeg'),
	imageminGiflossy = require('imagemin-giflossy'),
	pug              = require('gulp-pug'),
	plumber          = require('gulp-plumber'),
	svgSymbols       = require('gulp-svg-symbols'),
	htmlbeautify     = require('gulp-html-beautify');

// таск для компиляции scss в css
gulp.task('sass', function() {
	return gulp.src('scss/style.scss')
	.pipe(sass().on('error', sass.logError))
	.pipe(autoprefixer(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], {cascade: true}))
	.pipe(gulp.dest('css'))
	.pipe(browserSync.reload({stream: true}))
});

// файлы для сборки
var jsFiles = [
	'node_modules/jquery/dist/jquery.min.js',
	'js/main.js',
];

// таск для объединения js файлов
gulp.task('scripts', function() {
	return gulp.src(jsFiles)
		.pipe(concat('main.min.js'))
		.pipe(gulp.dest('js')); // Выгружаем в папку app/js
});

gulp.task('demo', function () {
	console.log(svgSymbols());
	// return gulp.src('img/svg-for-sprite/*.svg')
	// 	.pipe(svgSymbols.demoPage())
	// 	.pipe(gulp.dest('./'));
});

gulp.task('sprites', function() {
	return gulp
		.src('img/svg-for-sprite/*.svg')
		.pipe(
			svgSymbols(
			{
				svgAttrs: { class: 'svg-symbol', },
				icons: [
				{
					id: `string`,
					class: `.string`,
					width: `a number as a string with a unit`,
					height: `a number as a string with a unit`,
					style: `string if exists`,
					svg: {
						name: `string (svg filename without extension)`,
						id: `string`,
						width: `number`,
						height: `number`,
						content: `the svg markup as a string`,
						viewBox: `string`,
					//   originalAttributes: {
					// 	 every attributes before processing them
					},
				}],
				transformData: function(svg, defaultData, options) {
					console.log(svg, options);
				  /******
				  svg is same object as the one passed to the templates (see above)

				  defaultData are the ones needed by default templates
				  see /lib/get-default-data.js

				  options are the one you have set in your gulpfile,
				    minus templates & transformData
				  *******/

				  return {
				    // Return every datas you need
				    id:         defaultData.id,
				    class:      defaultData.class,
				    width:      `${svg.width}em`,
				    height:     `${svg.height}em`
				  };
				}

			})
		)
		.pipe(gulp.dest('img/'))
})


// таск для сборки, транспалирования и сжатия скриптов
gulp.task('scripts-build', function() {
	return gulp.src(jsFiles)
		.pipe(babel({
			presets: ['@babel/preset-env']
		})) // транспалируем из es6
		.pipe(concat('main.min.js'))
		.pipe(uglify()) // Сжимаем JS файл
		.pipe(gulp.dest('js')); // Выгружаем в папку app/js
});

// приводим впорядок скомпилированный код после pug-a
gulp.task('htmlbeautify', function() {
	var options = {
		indentSize: 4,
		unformatted: [
			// https://www.w3.org/TR/html5/dom.html#phrasing-content
			 'abbr', 'area', 'b', 'bdi', 'bdo', 'br', 'cite',
			'code', 'data', 'datalist', 'del', 'dfn', 'em', 'embed', 'i', 'ins', 'kbd', 'keygen', 'map', 'mark', 'math', 'meter', 'noscript',
			'object', 'output', 'progress', 'q', 'ruby', 's', 'samp', 'small',
			 'strong', 'sub', 'sup', 'template', 'time', 'u', 'var', 'wbr', 'text',
			'acronym', 'address', 'big', 'dt', 'ins', 'strike', 'tt', 'a'
		],
		"indent_char": " ",
		"indent_level": 1,
		"indent_with_tabs": false,
	};
	gulp.src('./*.html')
		.pipe(htmlbeautify(options))
		.pipe(gulp.dest('./'));
});

// компиляция pug файлов
gulp.task('pug', function() {
	return gulp.src("./src/*.pug")
		.pipe(plumber())
		.pipe(pug())
		.pipe(htmlbeautify())
		.pipe(gulp.dest("./"))
		.pipe(browserSync.stream());
});

// таск для обновления страницы
gulp.task('browser-sync', function() {
	browserSync({
		server: {
			baseDir: './'
		},
		notify: false,
	})
});

// таск следит за изменениями файлов и вызывает другие таски
gulp.task('watch', function() {
	gulp.watch('scss/**/*.scss',['sass']);
	gulp.watch(['src/*.pug','src/**/*.pug'],['pug']);
	gulp.watch(['js/vendors/*.js', 'js/main.js', 'js/modules/*.js'],['scripts']);
	gulp.watch('img/**/*.svg', ['sprites']);
	gulp.watch('img/*', browserSync.reload);
	gulp.watch('src/*.html', browserSync.reload);
	gulp.watch('**/*.html', browserSync.reload);
	gulp.watch('js/*.js', browserSync.reload);
});

// таск сжимает картинки без потери качества
gulp.task('img', function() {
	return gulp.src('img/**') // откуда брать картинки
	.pipe(cache(imagemin([
		//png
		pngquant({
			speed: 1,
			quality: [0.3, 0.5] //lossy settings
		}),
		imageminZopfli({
			more: true
			// iterations: 50 // very slow but more effective
		}),
		//svg
		imagemin.svgo({
			plugins: [{
				removeViewBox: false
			}]
		}),
		//jpg lossless
		imagemin.jpegtran({
			progressive: true
		}),
		//jpg very light lossy, use vs jpegtran
		imageminMozjpeg({
			quality: 85
		})
	])))
	.pipe(gulp.dest('img/')) // куда класть сжатые картинки
});

// сборка проекта
gulp.task('build', ['sass', 'pug', 'scripts-build', 'img'])

// основной таск, который запускает вспомогательные
gulp.task('default', ['browser-sync','watch', 'sass', 'pug', 'scripts']);