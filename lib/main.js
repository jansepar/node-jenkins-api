'use strict';

var util     = require('util')
    ,qs      = require('querystring')
    ,request = require('request');

var API = '/api/json';
var URL_TOKEN = '?token=';
var NEWJOB = '%s/createItem/?name=%s';
var DELETE = '%s/job/%s/doDelete%s';
var DELETE_BUILD = '%s/job/%s/%s/doDelete%s';
var BUILD = '%s/job/%s/build' + API + '%s';
var STOP_BUILD = '%s/job/%s/%s/stop' + API + '%s';
var BUILD_INFO = '%s/job/%s/%s' + API + '%s';
var DISABLE = '%s/job/%s/disable%s';
var ENABLE = '%s/job/%s/enable%s';
var BUILDWITHPARAMS = '%s/job/%s/buildWithParameters%s';
var CONFIG = '%s/job/%s/config.xml%s';
var JOBINFO = '%s/job/%s' + API + '%s';
var LIST = '%s' + API;
var LIST_VIEW = '%s/view/%s' + API;
var LAST_SUCCESS = '%s/job/%s/lastSuccessfulBuild' + API + '%s';
var TEST_REPORT = '%s/job/%s/lastSuccessfulBuild/testReport' + API + '%s';
var LAST_BUILD = '%s/job/%s/lastBuild' + API + '%s';
var LAST_COMPLETED_BUILD = '%s/job/%s/lastCompletedBuild' + API + '%s';
var LAST_REPORT = '%s/job/%s/lastBuild' + API + '%s';
var QUEUE = '%s/queue' + API;
var QUEUE_ITEM = '%s/queue/item/%s' + API;
var COMPUTERS = '%s/computer' + API;
var JOB_OUTPUT = '%s/job/%s/consoleText' + API + '%s';


var init = exports.init = function(host, options, token) {

    if (options) {
        request = request.defaults(options);
    }

    //Helper Functions
    var build_url = function(command) {
        /*
        Builds REST url to Jenkins
        */
        
        // Create the url using the format function
        var url = util.format.call(this, command, host);

        // if command is the only arg, we are done
        if (arguments.length == 1) return url;

        // Grab the arguments except for the first (command)
        var args = Array.prototype.slice.call(arguments).slice(1);

        // Append url to front of args array
        args.unshift(url);

        // Create full url with all the arguments
        url = util.format.apply(this, args);

        return url;


    };

    var build_params = function(custom_params, token) {
        /*
        Build REST params to allow jenkins to specify additional configuration options
        */
        var params_url = '', params_length = Object.keys(custom_params).length;
        if (0 < params_length) {
            for(var param in custom_params) {
                if (custom_params.hasOwnProperty(param)) {
                    params_url += '&' + param + '=' + custom_params[param];
                }
            }
            if (token) {
                params_url = ('?token=' + token) + params_url;
            } else {
                params_url = '?' + params_url.substr(1);
            }
        } else {
            if (token) {
                params_url += ('token=' + token);
                params_url = '?' + params_url;
            }
        }

        return params_url;
    };

    return {
        build: function(jobname, params, custom_params, callback) {
            var buildurl, buildparams = build_params(custom_params, token);
            //custom_params are optional
            callback = callback || custom_params;

            /*
            Trigger Jenkins to build.
            */
            if (typeof params === 'function') { 
                buildurl = build_url(BUILD, jobname, buildparams);
                callback = params;
            } else {
                buildurl = build_url(BUILDWITHPARAMS+"?"+qs.stringify(params), jobname, buildparams)
            }
            
            request({method: 'POST', url: buildurl }, function(error, response) {
                if ( error || (response.statusCode !== 201 && response.statusCode !== 302) ) {
                    callback(error, response);
                    return;
                }
                /*
                Return queue location of newly-created job as per
                  https://issues.jenkins-ci.org/browse/JENKINS-12827?focusedCommentId=201381#comment-201381
                */
                var data = {
                    message: "job is executed",
                    location: response.headers["Location"] || response.headers["location"]
                };
                callback(null, data);
            });
        },
        stop_build: function(jobname, buildNumber, custom_params, callback) {
            var buildurl, buildparams = build_params(custom_params, token);
            buildurl = build_url(STOP_BUILD, jobname, buildNumber, buildparams);
            //custom_params are optional
            callback = callback || custom_params;

            request({method: 'POST', url: buildurl }, function(error, response) {
                if ( error || (response.statusCode !== 201 && response.statusCode !== 302) ) {
                    callback(error, response);
                    return;
                }
                var data = "job is stopped";
                callback(null, data);
            });
        },
        all_jobs: function(custom_params, callback) {
            var buildparams = build_params(custom_params);
            //custom_params are optional
            callback = callback || custom_params;

            /*
            Return a list of object literals containing the name and color of all jobs on the Jenkins server
            */
            request({method: 'GET', url: build_url(LIST)}, function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.parse(body.toString()).jobs;
                callback(null, data);
            });
        },
        all_jobs_in_view: function(view, custom_params, callback) {
            var buildparams = build_params(custom_params);
            //custom_params are optional
            callback = callback || custom_params;

            /*
            Return a list of objet literals containing the name and color of all the jobs for a view on the Jenkins server
             */
            request({method: 'GET', url: build_url(LIST_VIEW, view)}, function (error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.parse(body.toString()).jobs;
                callback(null, data);
            })
        },
        job_info: function(jobname, custom_params, callback) {
            var buildparams = build_params(custom_params, token);
            //custom_params are optional
            callback = callback || custom_params;

            /*
            Get all information for a job
            */
            request({method: 'GET', url: build_url(JOBINFO, jobname, buildparams)}, function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.parse(body.toString());
                callback(null, data);
            });
        },
        last_build_info: function(jobname, custom_params, callback) {
            var buildparams = build_params(custom_params, token);
            //custom_params are optional
            callback = callback || custom_params;

            /*
            Get information for the last build of a job
            */
            request({method: 'GET', url: build_url(LAST_BUILD, jobname, buildparams)}, function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.parse(body.toString());
                callback(null, data);
            });
        },
        last_completed_build_info: function(jobname, custom_params, callback) {
            var buildparams = build_params(custom_params, token);
            //custom_params are optional
            callback = callback || custom_params;

            /*
            Get information for the last completed build of a job
            */
            request({method: 'GET', url: build_url(LAST_COMPLETED_BUILD, jobname, buildparams)}, function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.parse(body.toString());
                callback(null, data);
            });
        },
        build_info: function(jobname, number, custom_params, callback) {
            var buildparams = build_params(custom_params, token);
            //custom_params are optional
            callback = callback || custom_params;

            /*
            Get information for the build number of a job
            */
            request({method: 'GET', url: build_url(BUILD_INFO, jobname, number, buildparams)}, function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.parse(body.toString());
                callback(null, data);
            });
        },
        last_build_report: function(jobname, custom_params, callback) {
            var buildparams = build_params(custom_params, token);
            //custom_params are optional
            callback = callback || custom_params;

            /*
            Get the last build report for a job
            */
            request({method: 'GET', url: build_url(LAST_REPORT, jobname, buildparams)}, function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.parse(body.toString());
                callback(null, data);
            });
        },
        get_config_xml: function(jobname, custom_params, callback) {
            var buildparams = build_params(custom_params, token);
            //custom_params are optional
            callback = callback || custom_params;

            /*
            Get the config xml for a job
            */
            request({method: 'GET', url: build_url(CONFIG, jobname, buildparams)}, function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = body;
                callback(null, data);
            });
        },
        create_job: function(jobname, job_config, custom_params, callback) {
            var buildparams = build_params(custom_params);
            //custom_params are optional
            callback = callback || custom_params;

            /*
           Create a new job based on a job_config string 
            */

            request(
                {method: 'POST' 
                ,url: build_url(NEWJOB, jobname, buildparams)
                ,body: job_config
                ,headers: { "content-type": "application/xml"}
                }, 
                
                function(error, response, body) {
                    if ( error || response.statusCode !== 200 ) {
                        callback(error || true, response);
                        return;
                    }
                    var data = body;
                    callback(null, data);
                }
            );
        },
        update_job: function(jobname, modifyfunction, custom_params, callback) {
            var buildparams = build_params(custom_params, token);
            //custom_params are optional
            callback = callback || custom_params;

            /*
            Copies a job and allows you to pass in a function to modify the configuration
            of the job you would like to copy
            */

            this.get_config_xml(jobname, function(error, data) {
                if (error) {
                    callback(error, data);
                    return;
                }
                request({method: 'POST', url: build_url(CONFIG, jobname, buildparams), body: modifyfunction(data)}, function(error, response, body) {
                    if ( error || response.statusCode !== 200 ) {
                        callback(error || true, response);
                        return;
                    }
                    var data = body;
                    callback(null, data);
                });
            });

        },
        copy_job: function(jobname, new_job, modifyfunction, custom_params, callback) {
            var buildparams = build_params(custom_params);
            //custom_params are optional
            callback = callback || custom_params;

            /*
            Copies a job and allows you to pass in a function to modify the configuration
            of the job you would like to copy
            */

            var self = this;
            this.get_config_xml(jobname, buildparams, function(error, data) {
                if (error) {
                    callback(error, data);
                    return;
                }
                self.create_job(new_job, modifyfunction(data), buildparams, function(error, data) {
                    if (error) {
                        callback(error, data);
                        return;
                    }
                    callback(null, data);
                });
            });

        },
        delete_job: function(jobname, custom_params, callback) {
            var buildparams = build_params(custom_params, token);
            //custom_params are optional
            callback = callback || custom_params;

            /*
            Deletes a job 
            */
            request({method: 'POST', url: build_url(DELETE, jobname, buildparams)}, function(error, response, body) {
                if ( error || response.statusCode === 404 ) {
                    callback(error || true, response);
                    return;
                }
                callback(null, body);
            });
            
        },
        delete_build: function(jobname, build_number, custom_params, callback) {
            var buildparams = build_params(custom_params, token);
            //custom_params are optional
            callback = callback || custom_params;

            /*
            Deletes build data for certain job
            */
            request({method: 'POST', url: build_url(DELETE_BUILD, jobname, build_number, buildparams)}, function(error, response, body) {
                if ( error || response.statusCode === 404 ) {
                    callback(error || true, response);
                    return;
                }
                callback(null, body);
            });

        },
        disable_job: function(jobname, custom_params, callback) {
            var buildparams = build_params(custom_params, token);
            //custom_params are optional
            callback = callback || custom_params;

            /*
            Disables a job
            */
            request({method: 'POST', url: build_url(DISABLE, jobname, buildparams)}, function(error, response, body) {
                if ( error || response.statusCode === 404 ) {
                    callback(error || true, response);
                    return;
                }
                callback(null, body);
            });
        },
        enable_job: function(jobname, custom_params, callback) {
            var buildparams = build_params(custom_params, token);
            //custom_params are optional
            callback = callback || custom_params;

            /*
            Enables a job
            */
            request({method: 'POST', url: build_url(ENABLE, jobname, buildparams)}, function(error, response, body) {
                if ( error || response.statusCode === 404 ) {
                    callback(error || true, response);
                    return;
                }
                callback(null, body);
            });
        },
        last_success: function(jobname, custom_params, callback) {
            var buildparams = build_params(custom_params, token);
            //custom_params are optional
            callback = callback || custom_params;

            /*
            Get the last build report for a job
            */
            request({method: 'POST', url: build_url(LAST_SUCCESS, jobname, buildparams)}, function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.parse(body);
                callback(null, data);
            });
            
        },
        last_result: function(jobname, custom_params, callback) {
            var buildparams = build_params(custom_params, token);
            //custom_params are optional
            callback = callback || custom_params;

            /*
            Get the last result for a job
            */
            this.job_info(jobname, function(error, data) {
                var last_result_url = data.lastBuild.url;
                
                request({method: 'GET', url: build_url(last_result_url + API, jobname, buildparams)}, function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                        callback(error || true, response);
                        return;
                    }
                    data = JSON.parse(body);
                    callback(null, data);
                });
            });
            
        },
        queue: function(custom_params, callback) {
            var buildparams = build_params(custom_params);
            //custom_params are optional
            callback = callback || custom_params;

            /*
             Get all queued items
             */
            request({method: 'GET', url: build_url(QUEUE, buildparams)}, function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.parse(body.toString());
                callback(null, data);
            });
        },
        queue_item: function(queue_number, custom_params, callback) {
            var buildparams = build_params(custom_params);
            //custom_params are optional
            callback = callback || custom_params;

            /*
             Get one queued item
             */
            request({method: 'GET', url: build_url(QUEUE_ITEM, queue_number, buildparams)}, function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.parse(body.toString());
                callback(null, data);
            });
        },
        computers: function(custom_params, callback) {
            var buildparams = build_params(custom_params);
            //custom_params are optional
            callback = callback || custom_params;

            /*
             Get info about all jenkins workers including currently executing jobs
             */
            request({method: 'GET', url: build_url(COMPUTERS, buildparams)}, function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.parse(body.toString());
                callback(null, data);
            });
        },
        job_output: function(jobname, buildname, custom_params, callback) {
            var buildparams = build_params(custom_params, token);
            //custom_params are optional
            callback = callback || custom_params;

            /*
            Get the output for a job's build
            */
            request({method: 'POST', url: build_url(JOB_OUTPUT, jobname + '/' + buildname, buildparams)}, function(error, response, body) {
                if (response.statusCode !== 200 || error) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.stringify({"output": body});
                data = JSON.parse(data);
                callback(null, data);
            });
        }
    }
};

if (!module.parent) {
}
