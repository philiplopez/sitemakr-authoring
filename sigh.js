var babel, concat, glob, write, debounce, mocha;

module.exports = function (pipelines) {
    pipelines['build-source'] = [
        glob({basePath: 'src'}, '**/*.js'),
        babel(),
        write({clobber: true}, 'dist')
    ];
};


