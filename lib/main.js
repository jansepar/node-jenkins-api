'use strict';

var util     = require('util')
    ,qs      = require('querystring')
    ,request = require('request');

var API = '/api/json';
var NEWJOB = '%s/createItem/?name=%s';
var DELETE = '%s/job/%s/doDelete';
var BUILD = '%s/job/%s/build' + API;
var STOP_BUILD = '%s/job/%s/%s/stop' + API;
var BUILD_INFO = '%s/job/%s/%s' + API;
var DISABLE = '%s/job/%s/disable';
var ENABLE = '%s/job/%s/enable';
var BUILDWITHPARAMS = '%s/job/%s/buildWithParameters';
var CONFIG = '%s/job/%s/config.xml';
var JOBINFO = '%s/job/%s' + API;
var LIST = '%s' + API;
var LIST_VIEW = '%s/view/%s' + API;
var LAST_SUCCESS = '%s/job/%s/lastSuccessfulBuild' + API;
var TEST_REPORT = '%s/job/%s/lastSuccessfulBuild/testReport' + API;
var LAST_BUILD = '%s/job/%s/lastBuild' + API;
var LAST_COMPLETED_BUILD = '%s/job/%s/lastCompletedBuild' + API;
var LAST_REPORT = '%s/job/%s/lastBuild' + API;
var QUEUE = '%s/queue' + API;
var COMPUTERS = '%s/computer' + API;
var JOB_OUTPUT = '%s/job/%s/consoleText' + API;


var init = exports.init = function(host, options) {

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
        stop_build: function(jobname, buildNumber, callback) {
            var buildurl;
            buildurl = build_url(STOP_BUILD, jobname, buildNumber);

            request({method: 'POST', url: buildurl }, function(error, response) {
                if ( error || (response.statusCode !== 201 && response.statusCode !== 302) ) {
                    callback(error, response);
                    return;
                }
                var data = "job is stopped";
                callback(null, data);
            });
        },
        all_jobs: function(callback) {
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
        all_jobs_in_view: function(view, callback) {
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
        job_info: function(jobname, callback) {
            /*
            Get all information for a job
            */
            request({method: 'GET', url: build_url(JOBINFO, jobname)}, function(error, response, body) {
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
            request({method: 'GET', url: build_url(LAST_BUILD, jobname)}, function(error, response, body) {
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
            request({method: 'GET', url: build_url(LAST_COMPLETED_BUILD, jobname)}, function(error, response, body) {
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
            request({method: 'GET', url: build_url(BUILD_INFO, jobname, number)}, function(error, response, body) {
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
            request({method: 'GET', url: build_url(LAST_REPORT, jobname)}, function(error, response, body) {
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
            request({method: 'GET', url: build_url(CONFIG, jobname)}, function(error, response, body) {
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
        update_job: function(jobname, modifyfunction, callback) {
            /*
            Copies a job and allows you to pass in a function to modify the configuration
            of the job you would like to copy
            */

            this.get_config_xml(jobname, function(error, data) {
                if (error) {
                    callback(error, data);
                    return;
                }
                request({method: 'POST', url: build_url(CONFIG, jobname), body: modifyfunction(data)}, function(error, response, body) {
                    if ( error || response.statusCode !== 200 ) {
                        callback(error || true, response);
                        return;
                    }
                    var data = body;
                    callback(null, data);
                });
            });

        },
        copy_job: function(jobname, new_job, modifyfunction, callback) {
            /*
            Copies a job and allows you to pass in a function to modify the configuration
            of the job you would like to copy
            */

            var self = this;
            this.get_config_xml(jobname, function(error, data) {
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
            this.job_info(jobname, function(error, data) {
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
            request({method: 'POST', url: build_url(JOB_OUTPUT, jobname + '/' + buildname)}, function(error, response, body) {
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
