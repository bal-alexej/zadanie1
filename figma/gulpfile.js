let project_folder = require("path").basename(__dirname); //Папка в которую выводится результат работы галпа(Собирается проект/Передаём заказчику)
let source_folder = "#src"; //Папка с исходниками
let fs = require("fs");

let path = {
  //Переменная path содержит объекты, которые содержат пути к различным папкам и файлам
  build: {
    //Объект содержащий пути вывода, куда галп помещает уже обработанные файлы
    html: project_folder + "/", //Путь к html файлу
    css: project_folder + "/css/", //Путь к css файлу
    js: project_folder + "/js/", //Путь к js файлу
    img: project_folder + "/img/", //Путь к картинкам файлу
    fonts: project_folder + "/fonts/", //Путь к файлу со ширифтами
  },
  src: {
    //Объект содержащий пути к исходниками
    html: [source_folder + "/*.html", "!" + source_folder + "/_*.html"],
    css: source_folder + "/scss/style.scss",
    js: source_folder + "/js/script.js",
    img: source_folder + "/img/**/*.{jpg,png,svg,ico,webp}",
    fonts: source_folder + "/fonts/*.ttf",
  },
  watch: {
    //Пути к файлам которые нам надо слушать постоянно(отлавливать их изменения и выполнять их)
    html: source_folder + "/**/*.html",
    css: source_folder + "/scss/**/*.scss",
    js: source_folder + "/js/**/*.js",
    img: source_folder + "/img/**/*.{jpg,png,svg,ico,webp}",
  },
  clean: "./" + project_folder + "/", //Объект, который содержит путь к папке проекта(Объект отвечает за удаление этой папки каждый раз когда мы запускаем галп)
};

let { src, dest } = require("gulp"), //Присвоение переменным src и dest  галпа
  gulp = require("gulp"),
  browsersync = require("browser-sync").create(),
  fileinclude = require("gulp-file-include"),
  del = require("del"),
  scss = require("gulp-sass"),
  autoprefixer = require("gulp-autoprefixer"),
  group_media = require("gulp-group-css-media-queries"),
  clean_css = require("gulp-clean-css"),
  rename = require("gulp-rename"),
  uglify = require("gulp-uglify-es").default,
  imagemin = require("gulp-imagemin"),
  webp = require("gulp-webp"),
  webphtml = require("gulp-webp-html"),
  svgSprite = require("gulp-svg-sprite"),
  ttf2woff = require("gulp-ttf2woff"),
  ttf2woff2 = require("gulp-ttf2woff2"),
  fonter = require("gulp-fonter");

function browserSync(params) {
  //Функция обновляющая браузер
  browsersync.init({
    server: {
      baseDir: "./" + project_folder + "/", //Базовая папка
    },
    port: 3000, //Порт на котором открывается сайт
    notife: false, //Убирание таблички "Браузер обновился"
  });
}

function html() {
  //Функция для работы с html файлами
  return src(path.src.html) //Путь к исходникам
    .pipe(fileinclude())
    .pipe(webphtml())
    .pipe(dest(path.build.html))
    .pipe(browsersync.stream());
}

function css() {
  //Функция для работы с css файлами
  return src(path.src.css) //Путь к исходникам
    .pipe(
      scss({
        outputStyle: "expanded",
      })
    )
    .pipe(group_media())
    .pipe(
      autoprefixer({
        overrideBrowserslist: ["last 5 versions"],
        cascade: true,
      })
    ) //gulp-webp не настроено
    .pipe(dest(path.build.css))
    .pipe(clean_css())
    .pipe(
      rename({
        extname: ".min.css", //Добавляем приставку мин
      })
    )
    .pipe(dest(path.build.css))
    .pipe(browsersync.stream());
}

function js() {
  //Функция для работы с html файлами
  return src(path.src.js) //Путь к исходникам
    .pipe(fileinclude())
    .pipe(dest(path.build.js))
    .pipe(uglify())
    .pipe(
      rename({
        extname: ".min.js", //Добавляем приставку мин
      })
    )
    .pipe(dest(path.build.js))
    .pipe(browsersync.stream());
}

function images() {
  //Функция для работы с картинками
  return src(path.src.img) //Путь к исходникам
    .pipe(
      webp({
        quality: 70,
      })
    )
    .pipe(dest(path.build.img))
    .pipe(src(path.src.img))
    .pipe(
      imagemin({
        progressive: true,
        svgoPlugins: [
          {
            removeViewBox: false,
          },
        ],
        interlaced: true,
        optimizationLevel: 3, //0 to 7
      })
    )
    .pipe(dest(path.build.img))
    .pipe(browsersync.stream());
}

function fonts() {
  src(path.src.fonts).pipe(ttf2woff()).pipe(dest(path.build.fonts));
  return src(path.src.fonts).pipe(ttf2woff2()).pipe(dest(path.build.fonts));
}

gulp.task("otf2ttf", function () {
  return src([source_folder + "/fonts/*.otf"])
    .pipe(
      fonter({
        formats: ["ttf"],
      })
    )
    .pipe(dest(source_folder + "/fonts/"));
});

function fontsStyle(params) {
  let file_content = fs.readFileSync(source_folder + "/scss/fonts.scss");
  if (file_content == "") {
    fs.writeFile(source_folder + "/scss/fonts.scss", "", cb);
    return fs.readdir(path.build.fonts, function (err, items) {
      if (items) {
        let c_fontname;
        for (var i = 0; i < items.length; i++) {
          let fontname = items[i].split(".");
          fontname = fontname[0];
          if (c_fontname != fontname) {
            fs.appendFile(
              source_folder + "/scss/fonts.scss",
              '@include font("' +
                fontname +
                '", "' +
                fontname +
                '", "400", "normal");\r\n',
              cb
            );
          }
          c_fontname = fontname;
        }
      }
    });
  }
}

function cb() {}

function watchFiles(params) {
  gulp.watch([path.watch.html], html);
  gulp.watch([path.watch.css], css);
  gulp.watch([path.watch.js], js);
  gulp.watch([path.watch.img], images);
}

function clean(params) {
  //Функция удаления ненкжных файлов
  return del(path.clean);
}

let build = gulp.series(
  clean,
  gulp.parallel(js, css, html, images, fonts),
  fontsStyle
);
let watch = gulp.parallel(build, watchFiles, browserSync); //Функции оторые должны выполняться

exports.fontsStyle = fontsStyle; //Дружим галп с переменными
exports.fonts = fonts; //Дружим галп с переменными
exports.images = images; //Дружим галп с переменными
exports.js = js; //Дружим галп с переменными
exports.css = css; //Дружим галп с переменными
exports.html = html; //Дружим галп с переменными
exports.build = build; //Дружим галп с переменными
exports.watch = watch; //Дружим галп с переменнымиf
exports.default = watch;
