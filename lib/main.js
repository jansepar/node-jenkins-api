'use strict';

var util     = require('util')
    ,qs      = require('querystring')
    ,request = require('request');

var API = '/api/json';

var NEWJOB = '%s/createItem/?name=%s';
var NEWFOLDER = '%s/createItem/?name=%s&mode=%s&Submit=OK%s';
var DELETE = '%s/job/%s/doDelete%s';
var DELETE_BUILD = '%s/job/%s/%s/doDelete%s';
var BUILD = '%s/job/%s/build' + API + '%s';
var STOP_BUILD = '%s/job/%s/%s/stop' + API + '%s';
var BUILD_INFO = '%s/job/%s/%s' + API + '%s';
var DISABLE = '%s/job/%s/disable%s';
var ENABLE = '%s/job/%s/enable%s';
var BUILDWITHPARAMS = '%s/job/%s/buildWithParameters%s';
var CONFIG = '%s/job/%s/config.xml';
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
var UPDATEJOB = '%s/job/%s/config.xml' + API;
var NEW_VIEW = '%s/createView';
var CONFIG_VIEW = '%s/view/%s/configSubmit';
var DELETE_VIEW = '%s/view/%s/doDelete';
var JOB_OUTPUT = '%s/job/%s/consoleText' + API + '%s';
var JOB_BUILD_QUEUE = '%s/queue/item/%s/'+API;

//var ALL_BUILDS = '%s/job/%s' + API + '?tree=allBuilds[id,timestamp,result,duration]'; 
var ALL_BUILDS = '%s/job/%s' + API + '?tree=allBuilds[%s]';
var CANCEL_ITEM = '%s/queue/cancelItem?id=%s';

var PLUGINS = '%s/pluginManager' + API;
var INSTALL_PLUGIN='%s/pluginManager/installNecessaryPlugins' + API;

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

    /**
     * @param body string response body
     * @param property string|function property to get from body or modificator function
     * @param callback function to call when all done
     */
    var tryParseJson = function(body, property, callback) {
        if (typeof callback === 'undefined') {
          callback = property;
          property = null;
        }

        try {
            // Won't harm if we replace escape sequence
            body = body.replace(/\x1b/g,"");

            // Try to parse
            var data = JSON.parse(body.toString());

            // Get the prop name if specified
            if (property) {
              if (typeof property === 'string') {
                data = data[property];
              }
              if (typeof property === 'function') {
                data = property(data);
              }
            }

            callback(null, data);
        } catch (e) {
            callback(e);
        }
    };

    /* Build REST params to allow jenkins to specify additional configuration options */
    var build_params = function(params, token) {
       if (token) {
         params.token = token;
       }
       return qs.stringify(params)
    };

    /**
     * options - {
     *  method: 'GET',
     *  urlPattern: ['/some/%s/url?pattern', 'some_param'], // list of url build params
     *  reqBody: {},                 // Data to be sent
     *  successStatusCodes: [200],   // What status codes denote success?
     *  bodyProp: '',                // What property to pick from result body
     *  noparse: false,              // Disable response parsing
     * }
     *
     * callback - function(data) { // What to do when finished } 
     */
    var doIt = function(options, custom_params, callback) {
        if (typeof callback === 'undefined') {
          callback = custom_params;
          custom_params = null;
        }

        options.successStatusCodes = options.successStatusCodes || [200];
        options.failureStatusCodes = options.failureStatusCodes || [];

        var url = build_url.apply(this, options.urlPattern) + build_params(custom_params, token);
        var requestOptions = {
          method: options.method,
          url: url,
          body: options.reqBody,
          headers: options.reqHeaders,
          form: options.reqForm,
          followRedirect: options.reqFollowRedirect,
        };

        request(requestOptions, function(error, response, body) {
            if (error || options.successStatusCodes.indexOf(response.statusCode) === -1 || options.failureStatusCodes.indexOf(response.statusCode) !== -1) {
                callback(error || true, response);
                return;
            }

            // TODO verify
            var location = response.headers["Location"] || response.headers["location"]
            if (location) {
              body.location = location;
            }
            
            if (options.noparse) {
              callback(null, body);
            } else {
              tryParseJson(body, options.bodyProp, callback);
            }
        });
    };

    return {
        /* Trigger Jenkins to build.  */
        /* Return queue location of newly-created job as per
         * https://issues.jenkins-ci.org/browse/JENKINS-12827?focusedCommentId=201381#comment-201381
         */
        build: function(jobName, custom_params, callback) {
            if (typeof params === 'function' || !params) { 
                url = BUILD
                callback = params;
            } else {
                url = BUILDWITHPARAMS
            }

            doIt({
              method: 'POST',
              urlPattern: [url, jobName],
              successStatusCodes: [201, 302],
            }, custom_params, callback);
        },

        /* Get Job Queue status from the queue_id that is obtained in the job build phase! 
         * This function contains build no and other details too, so we can poll or update the status 
         * according to the corresponding job.  */
        get_build_id_from_queue_with_id: function(queueId, custom_params, callback) {
          doIt({
            method: 'GET',
            urlPattern: [JOB_BUILD_QUEUE, queueId],
          }, custom_params, callback);
        },

        /* Get Job Queue status from the queue_id that is obtained in the job build phase!  */
        get_build_id_from_queue: function(queueId, custom_params, callback) {
          doIt({
            method: 'GET',
            urlPattern: [JOB_BUILD_QUEUE, queueId],
            bodyProp: 'executable',
          }, custom_params, callback);
        },

        stop_build: function(jobName, buildNumber, custom_params, callback) {
           doIt({
             method: 'POST',
             urlPattern: [STOP_BUILD, jobName, buildNumber],
             successStatusCodes: [201, 302],
             bodyProp: 'executable',
           }, custom_params, function(error, data) {
             if (error) {
               callback(error, response);
               return;
              }
              var data = "job is stopped";
              callback(null, data);
           });
        },

        /* Return a list of object literals containing the name and color of all jobs on the Jenkins server */
        all_jobs: function(custom_params, callback) {
            doIt({
              method: 'GET',
              urlPattern: [LIST],
              bodyProp: 'jobs',
            }, custom_params, callback);
        },

        /* Return a list of objet literals containing the name and color of all the jobs for a view on the Jenkins server */
        all_jobs_in_view: function(viewId, custom_params, callback) {
            doIt({
              method: 'GET',
              urlPattern: [LIST_VIEW, viewId],
              bodyProp: 'jobs',
            }, custom_params, callback);
        },

        /* Return a list of all the views on the Jenkins server */
        all_views: function(custom_params, callback) {
            doIt({
              method: 'GET',
              urlPattern: [LIST],
              bodyProp: 'views',
            }, custom_params, callback);
        },		

        /* Get all information for a job */
        job_info: function(jobName, custom_params, callback) {
            doIt({
              method: 'GET',
              urlPattern: [JOBINFO, jobName],
            }, custom_params, callback);
        },

        /* Get information for the last build of a job */
        last_build_info: function(jobName, custom_params, callback) {
            doIt({
              method: 'GET',
              urlPattern: [LAST_BUILD, jobName],
            }, custom_params, callback);
        },

        /* Get information for the last completed build of a job */
        last_completed_build_info: function(jobName, custom_params, callback) {
            doIt({
              method: 'GET',
              urlPattern: [LAST_COMPLETED_BUILD, jobName],
            }, custom_params, callback);
        },

        /* Get information for the build number of a job */
        build_info: function(jobName, buildNumber, custom_params, callback) {
            doIt({
              method: 'GET',
              urlPattern: [BUILD_INFO, jobName, buildNumber],
            }, custom_params, callback);
        },

        /* Get information for the all build */
        all_builds: function(jobName, param, callback) {
            // TODO better name and handle the "param"
            doIt({
              method: 'GET',
              urlPattern: [ALL_BUILDS, jobName, param],
            }, custom_params, callback);
        },

        /* Get the test results for the build number of a job */
        test_result: function(jobName, buildNumber, callback) {
            doIt({
              method: 'GET',
              urlPattern: [TEST_REPORT, jobName, buildNumber],
            }, custom_params, callback);
        },

        /* Get the last build report for a job */
        last_build_report: function(jobName, custom_params, callback) {
            doIt({
              method: 'GET',
              urlPattern: [LAST_REPORT, jobName],
            }, custom_params, callback);
        },

        get_config_xml: function(jobName, custom_params, callback) {
            doIt({
              method: 'GET',
              urlPattern: [CONFIG, jobName],
              bodyProp: 'jobs',
              noparse: true
            }, custom_params, callback);
        },

        /* Create a new job based on a job_config string */
        create_job: function(jobName, job_config, custom_params, callback) {
            doIt({
              method: 'POST',
              urlPattern: [NEWJOB, jobName],
              reqBody: job_config,
              reqHeaders: { "content-type": "application/xml"},
              noparse: true, //TODO really?
            }, custom_params, callback);
        },

        /* Copies a job and allows you to pass in a function to modify the configuration of the job you would like to copy */
        update_job: function(jobName, modifyfunction, custom_params, callback) {

            this.get_config_xml(jobName, function(error, data) {
                // Fail when can not obtain config
                if (error) {
                    callback(error, data);
                    return;
                }

                // Modify the data
                if (typeof modifyfunction === 'function') {
                  data = modifyfunction(data);
                }

                doIt({
                  method: 'POST',
                  urlPattern: [CONFIG, jobName],
                  reqBody: data,
                  bodyProp: 'jobs',
                  noparse: true
                }, custom_params, callback);
            });
        },

        /* Copies a job and allows you to pass in a function to modify the configuration of the job you would like to copy */
        copy_job: function(jobName, newJobName, modifyfunction, custom_params, callback) {
            var self = this;
            this.get_config_xml(jobName, custom_params, function(error, data) {
                if (error) {
                    callback(error, data);
                    return;
                }
                self.create_job(newJobName, modifyfunction(data), custom_params, callback);
            });
        },

        /* Deletes a job */
        delete_job: function(jobName, custom_params, callback) {
            doIt({
              method: 'POST',
              urlPattern: [DELETE, jobName],
              failureStatusCodes: [404],
              noparse: true,
            }, custom_params, callback);
        },

        /* Deletes build data for certain job */
        delete_build: function(jobName, buildNumber, custom_params, callback) {
            doIt({
              method: 'POST',
              urlPattern: [DELETE_BUILD, jobName, buildNumber],
              failureStatusCodes: [404],
              noparse: true,
            }, custom_params, callback);
        },

        /* Disables a job */
        disable_job: function(jobName, custom_params, callback) {
            doIt({
              method: 'POST',
              urlPattern: [DISABLE, jobName],
              failureStatusCodes: [404],
              noparse: true,
            }, custom_params, callback);
        },

        /* Enables a job */
        enable_job: function(jobName, custom_params, callback) {
            doIt({
              method: 'POST',
              urlPattern: [ENABLE, jobName],
              failureStatusCodes: [404],
              noparse: true,
            }, custom_params, callback);
        },

        /* Get the last build report for a job */
        last_success: function(jobName, custom_params, callback) {
            doIt({
              method: 'POST',
              urlPattern: [LAST_SUCCESS, jobName],
            }, custom_params, callback);
        },

        /* Get the last result for a job */
        last_result: function(jobName, custom_params, callback) {
            this.job_info(jobName, function(error, data) {
                var last_result_url = data.lastBuild.url;
                doIt({
                  method: 'GET',
                  urlPattern: [last_result_url + API, jobName],
                }, custom_params, callback);
            });
        },

        /* Get all queued items */
        queue: function(custom_params, callback) {
            doIt({
              method: 'GET',
              urlPattern: [QUEUE],
            }, custom_params, callback);
        },

        /* Get one queued item */
        queue_item: function(queueNumber, custom_params, callback) {
            doIt({
              method: 'GET',
              urlPattern: [QUEUE_ITEM, queueNumber],
            }, custom_params, callback);
        },

        /* Cancel a queued item */
        cancel_item: function(itemId, custom_params, callback) {
            doIt({
              method: 'POST',
              urlPattern: [CANCEL_ITEM, itemId],
            }, custom_params, callback);
        },

        /* Get info about all jenkins workers including currently executing jobs */
        computers: function(custom_params, callback) {
            doIt({
              method: 'GET',
              urlPattern: [COMPUTERS],
            }, custom_params, callback);
        },

        /* Get the output for a job's build */
        job_output: function(jobName, buildName, custom_params, callback) {
            doIt({
              method: 'GET',
              urlPattern: [JOB_OUTPUT, jobName + '/' + buildName],
            }, custom_params, function(err, data) {
              if(err) {
                callback(err);
                return;
              }
              callback(null, {'output': data});
            });
        },

        /* Create a new folder
         * Needs Folder plugin in Jenkins: https://wiki.jenkins-ci.org/display/JENKINS/CloudBees+Folders+Plugin
         *  curl -XPOST 'http://jenkins/createItem?name=FolderName&mode=com.cloudbees.hudson.plugins.folder.Folder&from=&json=%7B%22name%22%3A%22FolderName%22%2C%22mode%22%3A%22com.cloudbees.hudson.plugins.folder.Folder%22%2C%22from%22%3A%22%22%2C%22Submit%22%3A%22OK%22%7D&Submit=OK' --user user.name:YourAPIToken -H "Content-Type:application/x-www-form-urlencoded"
         *  https://gist.github.com/stuart-warren/7786892
         */
        create_folder: function(foldername, custom_params, callback) {
            var mode = 'com.cloudbees.hudson.plugins.folder.Folder';
            doIt({
              method: 'POST',
              urlPattern: [NEWFOLDER, folder, mode],
              reqHeaders: {'content-type': 'application/x-www-form-urlencoded'},
            }, custom_params, callback);
        },

        /* Update a job config and allows you to pass in a function to modify the configuration of the job you would like to update */
        update_config: function(jobName, modifyfunction, custom_params, callback) {

            var self = this;
            self.get_config_xml(jobName, custom_params, function(error, data) {
                if (error) {
                    callback(error, data);
                    return;
                }
                self.update_job(jobName, modifyfunction(data), custom_params, callback);
            });
        },

        /* Update a existing job based on a job_config string */
        update_job: function(jobName, job_config, custom_params, callback) {
            doIt({
              method: 'POST',
              urlPattern: [UPDATEJOB, jobName],
              reqBody: job_config,
              reqHeaders: {'content-type': 'application/xml'},
              noparse: true,
            }, custom_params, callback);
        },

        create_view: function(viewName, mode, custom_params, callback) {
            // Shift params right if mode isn't string
            if (typeof mode !== 'string') {
              if (typeof callback === 'undefined') {
                callback = custom_params;
                custom_params = undefined;
              }
              if (typeof custom_params === 'undefined') {
                custom_params = mode;
                mode = undefined;
              }
            }

            // Shift params right if custom_params isn't object
            if (typeof custom_params !=== 'object' && typeof callback === 'undefined'){
                callback = custom_params;
                custom_params = null;
            }

            // viewName is required
            if (typeof viewName !== 'string') {
              callback(new Error('create_view(): first param `viewName` is required and should be string'));
              return;
            }

            var formData = {name: viewName, mode: mode || 'hudson.model.ListView'};
            formData.json = JSON.stringify(formData);

            doIt({
              method: 'POST',
              urlPattern: [NEW_VIEW],
              reqForm: formData,
              reqFollowRedirect: false,
              failureStatusCodes: [302],
              noparse: true,
            }, custom_params, function (error, body) {
              //var data = {name: viewName, location: response.headers['Location'] || response.headers['location']};
              var data = {name: viewName};
              callback(null, data);
            });
        },

        /* Update a view based on a viewConfig object */
        update_view: function(viewName, viewConfig, custom_params, callback) {
            viewConfig.json = JSON.stringify(viewConfig);
            doIt({
              method: 'POST',
              urlPattern: [CONFIG_VIEW, viewName],
              reqForm: viewConfig,
              reqHeaders: { 'content-type': 'application/x-www-form-urlencoded'},
              noparse: true,
            }, custom_params, callback);
        },

        delete_view: function(viewName, custom_params, callback) {
            // Shift params right if custom_params isn't object
            if (typeof custom_params !=== 'object' && typeof callback === 'undefined'){
                callback = custom_params;
                custom_params = null;
            }

            // viewName is required
            if (typeof viewName !== 'string') {
              callback(new Error('create_view(): first param `viewName` is required and should be string'));
              return;
            }

            doIt({
              method: 'POST',
              urlPattern: [DELETE_VIEW, viewName],
              failureStatusCodes: [302],
              noparse: true,
            }, custom_params, function (error, body) {
              //var data = {name: viewName, location: response.headers['Location'] || response.headers['location']};
              var data = {name: viewName};
              callback(null, data);
            });
        },

        /* Get all installed plugins */
        all_installed_plugins: function(custom_params, allback) {
            custom_params.depth = 1;
            doIt({
              method: 'GET',
              urlPattern: [PLUGINS],
              failureStatusCodes: [302],
              noparse: true,
              bodyProp: 'plugins',
            }, custom_params, callback);
        },

        /* Install a plugin */
        install_plugin: function(plugin, custom_params, callback) {
            var body = '<jenkins><install plugin="' + plugin +'" /></jenkins>';
            doIt({
              method: 'POST',
              urlPattern: [INSTALL_PLUGIN],
              reqBody: body,
              reqHeaders: { 'content-type': 'text/xml'},
              noparse: true,
              bodyProp: 'plugins',
            }, custom_params, callback);
        },
    }
};

if (!module.parent) {
}
