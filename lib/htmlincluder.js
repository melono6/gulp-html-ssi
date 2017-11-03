var isWin = /^win/.test(process.platform);

function File(file) {
	var f = {
		name : '',
		path : file.path,
		content : file.contents.toString('utf8'),
		processed : false,
		file : file
	};

	f.name = (isWin) ? file.path.split('\\') : file.path.split('/');
	f.name = f.name[f.name.length-1];

	return f;
}

module.exports = (function htmlSSI() {
	var includer = {},
	    wrapFiles = {},
		insertFiles = {},
		pageFiles = [],
        root;

	function fixFilePathForOS(path) {
		return (isWin) ? path.replace(/\//g, '\\') : path.replace(/\\/g, '/');
	}

	function buildPathFromRelativePath(cdir, fdir) {
		var dir,
			dirChar = (isWin) ? '\\' : '/';
        if (root) {
            dir = root.split(dirChar);
        } else {
            dir = cdir.split(dirChar);
			   dir.pop();
        }
		fdir = fixFilePathForOS(fdir);

		fdir.split(dirChar)
			.map(function(e) {
				(e === '..') ? dir.pop() : (e !== '.' && e !== '') ? dir.push(e) : void 0;
			});

		return dir.join(dirChar);
	}

	function processInserts(file) {
		var didWork  = false,
			top      = "",
			bottom   = "",
			filename = "",
			fndx     = -1,
			lndx     = -1,
			content  = file.content,
            i = 0,
            rege = new RegExp(/(\S+)=[\'"]?((?:(?!\/>|>|"|\').)+)/, 'g');

		fndx = content.indexOf('<!--#include');

		while(fndx > -1) {
            i++;
			didWork = true;
			top = content.slice(0,fndx);
			content = content.slice(fndx);
			lndx = content.indexOf('-->') + 3;
            
            var match,
                attrs = {};
            while ((match = rege.exec(content.slice(0, lndx))) !== null) {
                attrs[match[1]] = match[2];
            }

			filename = attrs.virtual;
            delete attrs.virtual;
			bottom = content.slice(lndx);
			filename = buildPathFromRelativePath(file.path, filename);
            

			if(insertFiles[filename]) {
				processFile(insertFiles[filename]);
                var inc = insertFiles[filename].content;
                
                var truereg = new RegExp(/{{\?(.*?)}}([\s\S]*?){{\/(.*?)}}/, 'g');
                var standardreg = new RegExp(/{{(?!\?)(?!\/)(.*?)}}/, 'g');
                
                while ((match = truereg.exec(inc)) !== null) {
                    var index,
                        iftext,
                        elsetext;
                    
                    if (match[2].indexOf("{{:else}}") > -1) {
                        index = match[2].indexOf("{{:else}}");
                        iftext = match[2].substring(0, index);
                        elsetext = match[2].substring(index + 9);
                        if (attrs[match[1]]) {
                            inc = inc.replace(match[0], iftext);
                        } else {
                            inc = inc.replace(match[0], elsetext);
                        }
                    } else {
                        if (attrs[match[1]]) {
                            inc = inc.replace(match[0], match[2]);
                        } else {
                            inc = inc.replace(match[0], '');
                        }
                    }
                }
                
                while ((match = standardreg.exec(inc)) !== null) {
                    if (attrs[match[1]]) {
                        inc = inc.replace(new RegExp('{{' + match[1] + '}}', 'g'), attrs[match[1]]);
                    }
                }
                
//                Object.keys(attrs).forEach(function(key) {
//                    if (attrs[key] !== 'virtual') {
//                        inc = inc.replace(new RegExp('{{' + key + '}}', 'g'), attrs[key]);
//                    }
//                });
				content = top + inc + bottom;
			}
			else {
				console.log("ERROR in file " + file.path + ": insert file `" + filename + "` does not exist");
				return false;
			}
            //C:\www\framework\Src\Framework.Web\markup\structure\skip-to-main-content.shtml
            //C:\www\framework\Src\Framework.Web\markup\structure\skip-to-main-content.shtml
			fndx = content.indexOf('<!--#include');
		}

		file.content = content;
		return didWork;
	}

	//this function will be called within processWraps and processInserts
	function processFile(file) {
		var changed = true;

		while(changed && !file.processed) {
			changed = false;
			changed = processInserts(file);
		}
		file.processed = true;
	}

	includer.initialize = function initialize(param) {
		//reset vars in case these had kept their value in closure
        if (param.root) {
            root = param.root;
        }
	    wrapFiles = {};
		insertFiles = {};
		pageFiles = [];
	};

	includer.buildHtml = function buildHtml(callback) {
		return pageFiles.map(function(file) {
			processFile(file);

			if(callback) {
				callback(file);
			}

			return file;
		});
	};

	includer.hashFile = function hashFile(file) {
		var f = File(file);
        //console.log(f.path);
		if(f.name[0] === '_')
			insertFiles[f.path] = f;
		else
            insertFiles[f.path] = f;
			pageFiles.push(f);
	};

	return includer;
})();
