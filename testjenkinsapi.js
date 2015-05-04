/**
 * This is my poor excuse of a test file. One day, I will write some unit tests.
 * Until then, this is all I have :)
 */

var jenkinsapi = require('./lib/main');


var jenkins = jenkinsapi.init("http://localhost:8080");

/*
jenkins.build('test', function(error, data) {
    if (error) {
        console.log(error);
    }
    console.log(data);
});
*/

/*
var view_name = "test";
jenkins.all_jobs_in_view(view_name, function (error, data) {
    if (error) {
        console.log(error);
    }
    console.log(data);
});
*/

/*
jenkins.all_jobs(function(error, data) { console.log(data)});
*/

/*
jenkins.job_info('test-madness', function(error, data) { 
        if(!error) {
            console.log(data);
        }
    
    });
*/

/*
jenkins.job_info('test', function(error, data) { 
    if (!error) {
        console.log(data);
    }

});
*/

//jenkins.last_build_info('test-development', function(error, data) { console.log(data);  });
//jenkins.last_build_report('test-development', function(error, data) { console.log(data);  });

/*
jenkins.get_config_xml('test-development', function(error, data) { 
    //console.log(data);  
    jenkins.create_job('test-copy', data, function(error, data) {
       //console.log(data); 
    });
});
*/
/*
jenkins.copy_job('test-development'
                ,'test-new'
                ,function(data) {
                    return data.replace('development','feature-branch');
                }
                ,function(error, data) {
                    //console.log(data);
                    jenkins.delete_job('test-new', function(error, data) {
                        if(error) {
                            console.log("error!");
                        }
                        console.log(data);   
                    });
                });
*/
/*
jenkins.delete_job('test-new', function(error, data) {
    if(error) {
        console.log("error!");
        console.log(data.body, data.statusCode);   
*/

//jenkins.computers(function(error, data) { console.log(data)});

//jenkins.queue(function(error, data) { console.log(data)});

jenkins.build
