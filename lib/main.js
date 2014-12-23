'use strict';

var util     = require('util')
    ,qs      = require('querystring')
    ,request = require('request');

var API = '/api/json';
var NEWJOB = '%s/createItem/?name=%s';
var DELETE = '%s/job/%s/doDelete';
var BUILD = '%s/job/%s/build' + API;
var BUILD_INFO = '%s/job/%s/%s' + API;
var DISABLE = '%s/job/%s/disable';
var ENABLE = '%s/job/%s/enable';
var BUILDWITHPARAMS = '%s/job/%s/buildWithParameters';
var CONFIG = '%s/job/%s/config.xml';
var JOBINFO = '%s/job/%s' + API;
var LIST = '%s' + API;
var LAST_SUCCESS = '%s/job/%s/lastSuccessfulBuild' + API;
var TEST_REPORT = '%s/job/%s/lastSuccessfulBuild/testReport' + API;
var LAST_BUILD = '%s/job/%s/lastBuild' + API;
var LAST_COMPLETED_BUILD = '%s/job/%s/lastCompletedBuild' + API;
var LAST_REPORT = '%s/job/%s/lastBuild' + API;
var LAST_PROMOTION_REPORT = '%s/job/%s/promotion/process/%s/lastBuild' + API;
var QUEUE = '%s/queue' + API;
var COMPUTERS = '%s/computer' + API;
var JOB_OUTPUT = '%s/job/%s/consoleText' + API;


var init = exports.init = function(host,headerOptions) {


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

    var extend = function (target, source) {
        target = target || {};
        for (var prop in source) {
            if (typeof source[prop] === 'object') {
                target[prop] = extend(target[prop], source[prop]);
            } else {
                target[prop] = source[prop];
            }
        }
        return target;
    }

    return {
        build: function(jobname, params, callback) {
            var buildurl;
            /*
            Trigger Jenkins to build.
            */
            if (typeof params === 'function') { 
                buildurl = build_url(BUILD, jobname);
                callback = params;
            } else {
                buildurl = build_url(BUILDWITHPARAMS+"?"+qs.stringify(params), jobname)
            }
            
            request(extend(headerOptions,{method: 'POST', url: buildurl }), function(error, response) {
                if ( error || (response.statusCode !== 201 && response.statusCode !== 302) ) {
                    callback(error, response);
                    return;
                }
                var data = "job is executed";
                callback(null, data);
            });
        },
        all_jobs: function(callback) {
            /*
            Return a list of object literals containing the name and color of all jobs on the Jenkins server
            */
            request(extend(headerOptions,{method: 'GET', url: build_url(LIST)}), function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.parse(body.toString()).jobs;
                callback(null, data);
            });
        },
        job_info: function(jobname, callback) {
            /*
            Get all information for a job
            */
            request(extend(headerOptions,{method: 'GET', url: build_url(JOBINFO, jobname)}), function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.parse(body.toString());
                callback(null, data);
            });
        },
        last_build_info: function(jobname, callback) {
            /*
            Get information for the last build of a job
            */
            request(extend(headerOptions,{method: 'GET', url: build_url(LAST_BUILD, jobname)}), function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.parse(body.toString());
                callback(null, data);
            });
        },
        last_completed_build_info: function(jobname, callback) {
            /*
            Get information for the last completed build of a job
            */
            request(extend(headerOptions,{method: 'GET', url: build_url(LAST_COMPLETED_BUILD, jobname)}), function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.parse(body.toString());
                callback(null, data);
            });
        },
        build_info: function(jobname, number, callback) {
            /*
            Get information for the build number of a job
            */
            request(extend(headerOptions,{method: 'GET', url: build_url(BUILD_INFO, jobname, number)}), function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.parse(body.toString());
                callback(null, data);
            });
        },
        last_build_report: function(jobname, callback) {
            /*
            Get the last build report for a job
            */
            request(extend(headerOptions,{method: 'GET', url: build_url(LAST_REPORT, jobname)}), function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.parse(body.toString());
                callback(null, data);
            });
        },
        last_promotion_report: function(jobname,promotion, callback) {
            /*
            Get the last build report for a job
            */
            request(extend(headerOptions,{method: 'GET', url: build_url(LAST_PROMOTION_REPORT, jobname, promotion)}), function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.parse(body.toString());
                callback(null, data);
            });
        },
        get_config_xml: function(jobname, callback) {
            /*
            Get the config xml for a job
            */
            request(extend(headerOptions,{method: 'GET', url: build_url(CONFIG, jobname)}), function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = body;
                callback(null, data);
            });
        },
        create_job: function(jobname, job_config, callback) {
            /*
           Create a new job based on a job_config string 
            */

            request(
                {method: 'POST' 
                ,url: build_url(NEWJOB, jobname)
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
        copy_job: function(jobname, new_job, modifyfunction, callback) {
            /*
            Copies a job and allows you to pass in a function to modify the configuration
            of the job you would like to copy
            */

            var self = this;
            self.get_config_xml(jobname, function(error, data) {
                if (error) {
                    callback(error, data);
                    return;
                }
                self.create_job(new_job, modifyfunction(data), function(error, data) {
                    if (error) {
                        callback(error, data);
                        return;
                    }
                    callback(null, data);
                });
            });

        },
        delete_job: function(jobname, callback) {
            /*
            Deletes a job 
            */
            request({method: 'POST', url: build_url(DELETE, jobname)}, function(error, response, body) {
                if ( error || response.statusCode === 404 ) {
                    callback(error || true, response);
                    return;
                }
                callback(null, body);
            });
            
        },
        disable_job: function(jobname, callback) {
            /*
            Disables a job
            */
            request({method: 'POST', url: build_url(DISABLE, jobname)}, function(error, response, body) {
                if ( error || response.statusCode === 404 ) {
                    callback(error || true, response);
                    return;
                }
                callback(null, body);
            });
        },
        enable_job: function(jobname, callback) {
            /*
            Enables a job
            */
            request({method: 'POST', url: build_url(ENABLE, jobname)}, function(error, response, body) {
                if ( error || response.statusCode === 404 ) {
                    callback(error || true, response);
                    return;
                }
                callback(null, body);
            });
        },
        last_success: function(jobname, callback) {
            /*
            Get the last build report for a job
            */
            request({method: 'POST', url: build_url(LAST_SUCCESS, jobname)}, function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.parse(body);
                callback(null, data);
            });
            
        },
        last_result: function(jobname, callback) {
            /*
            Get the last result for a job
            */
            var self = this;
            self.job_info(jobname, function(error, data) {
                var last_result_url = data.lastBuild.url;
                
                request({method: 'GET', url: build_url(last_result_url + API, jobname)}, function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                        callback(error || true, response);
                        return;
                    }
                    data = JSON.parse(body);
                    callback(null, data);
                });
            });
            
        },
        queue: function(callback) {
            /*
             Get all queued items
             */
            request({method: 'GET', url: build_url(QUEUE)}, function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.parse(body.toString());
                callback(null, data);
            });
        },
        computers: function(callback) {
            /*
             Get details about all jenkins workers including currently executing jobs
             */
            request({method: 'GET', url: build_url(COMPUTERS + '?depth=1')}, function(error, response, body) {
                if ( error || response.statusCode !== 200 ) {
                    callback(error || true, response);
                    return;
                }
                var data = JSON.parse(body.toString());
                callback(null, data);
            });
        },
        job_output: function(jobname, buildname, callback) {
            /*
            Get the output for a job's build
            */
            request(extend(headerOptions,{method: 'POST', url: build_url(JOB_OUTPUT, jobname + '/' + buildname)}), function(error, response, body) {
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
