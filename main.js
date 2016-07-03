var schema = {};

var main = function(){
    load_schema();
};

var html_special_chars = function(s){
    return $('<span></span>').text(s).html();
};

var template_replace = function(html, data){
    for (var i in data) {
        html = html.replace('{{' + i + '}}', data[i]);
    }
    return html;
};

var load_schema = function(){
    $.get('https://raw.githubusercontent.com/g0v/g0v.json/master/schemas/v1.json', function(ret){
        schema = ret;
        for (var id in ret.properties) {
            var meta = ret.properties[id];
            var html = '';
            var data = {};
            if ('undefined' !== typeof(meta.enum)) {
                html = $('#input-select').text();
                options = '<option>' + html_special_chars(meta.description) + '</option>';
                for (var i = 0; i < meta.enum.length; i ++) {
                    options += '<option value="' + html_special_chars(meta.enum[i]) + '">' + html_special_chars(meta.enum[i]) + '</option>';
                }
                data['OPTIONS'] = options;
            } else if ('array' == meta.type) {
                html = $('#input-text-array').text();
            } else {
                html = $('#input-text').text();
            }
            title = meta.title;
            if (meta.required) {
                title += ' (*)';
            }
            data['TITLE'] = html_special_chars(title);
            data['ID'] = html_special_chars(id);
            data['DESC'] = html_special_chars(meta.description);
            var form_group_dom = $(template_replace(html, data));
            form_group_dom.data('template-data', data).attr('id', 'g0v-form-group-' + id);
            $('#g0v-form-fields').append(form_group_dom);
            if (meta.type == 'array') {
                $('#g0v-form-group-' + id + ' .button-add').click();
            }
        }
    }, 'json');
};

$(function(){
    $('#g0v-form').on('click', '.button-add', function(e){
        e.preventDefault();
        var form_group_dom = $(this).parents('.form-group');
        form_group_dom.append(template_replace($('#input-text-array-entry').text(), form_group_dom.data('template-data')));
    });

    $('#g0v-form').on('click', '.button-remove', function(e){
        e.preventDefault();
        $(this).parents('.input-group').remove();
    });

    $('#g0v-form').submit(function(e){
        e.preventDefault();
        var ret = {};
        for (var id in schema.properties) {
            if (schema.properties[id].type == 'array') {
                var values = [];
                $('[name="' + id + '[]"]').each(function(){ values.push($(this).val()); });
                ret[id] = values;
            } else {
                ret[id] = $('[name="' + id + '"]').val();
            }
        }
        $('#output').val(JSON.stringify(ret, '', 2));
    });

    $('#import-form').submit(function(e){
        e.preventDefault();
        var url = $('#github-url').val();
        if (!url.match(/github\.com\/[^\/]*\/[^\/?]*/)) {
            alert("Invalid GitHub URL: " + url);
        }
        var matches = url.match(/github\.com\/([^\/]*)\/([^\/?]*)/);
        var json_url = 'https://raw.githubusercontent.com/' + matches[1] + '/' + matches[2] + '/master/g0v.json';
        $.get(json_url, function(ret){
            var warnings = [];
            for (var id in ret) {
                if (id.toLowerCase() != id) {
                    warnings.push("properties 應該都是小寫，" + id + " 使用到大寫");
                    id = id.toLowerCase();
                }

                if ('undefined' === typeof(schema.properties[id])) {
                    warnings.push("使用到 " + id + " 這個沒存在於 schema 的 properties");
                } else if ('undefined' !== typeof(schema.properties[id].enum)) {
                    var options = schema.properties[id].enum;
                    if (options.indexOf(ret[id]) < 0) {
                        warnings.push(id + " 的值必需是在: " + options.join(', ') + " 清單中");
                    } else {
                        $('[name="' + id + '"]').val(ret[id]);
                    }
                } else if ('array' == schema.properties[id].type) {
                    var values;
                    if ('object' !== typeof(ret[id])) {
                        values = [ret[id]];
                        warnings.push(id + " 型態是 array ，但是 g0v.json 內不是 array");
                    } else {
                        values = ret[id];
                    }
                    $('#g0v-form-group-' + id + ' .input-group').remove();
                    values.map(function(v) {
                        $('#g0v-form-group-' + id + ' .button-add').click();
                        $('#g0v-form-group-' + id + ' input:last').val(v);
                    });
                } else {
                    if ('string' !== typeof(ret[id])) {
                        warnings.push(id + " 型態是 string ，但是 g0v.json 內不是 string");
                        ret[id] = JSON.stringify(ret[id]);
                    }
                    $('[name="' + id + '"]').val(ret[id]);
                }
            }
            $('#warnings').val(warnings.map(function(v, i){ return (i+1) + '. ' + v; }).join("\n"));
        }, 'json');
    });
    main();
});

