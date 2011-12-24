var jenkinsapi = require('./jenkinsapi');


var jenkins = jenkinsapi.init("http://username:password@jenkins.yoursite.com");
/*
jenkins.build('crush-development', function(error, data) {
    if (error) {
        console.log(error);
    }
    console.log(data);
});
*/
jenkins.all_jobs(function(error, data) { console.log(data)});
/*
jenkins.job_info('crush-madness', function(error, data) { 
        if(!error) {
            console.log(data);
        }
    
    });
*/
//jenkins.last_build_info('crush-development', function(error, data) { console.log(data);  });
//jenkins.last_build_report('crush-development', function(error, data) { console.log(data);  });

/*
jenkins.get_config_xml('crush-development', function(error, data) { 
    //console.log(data);  
    jenkins.create_job('crush-copy', data, function(error, data) {
       //console.log(data); 
    });
});
*/
/*
jenkins.copy_job('crush-development'
                ,'crush-new'
                ,function(data) {
                    return data.replace('development','feature-branch');
                }
                ,function(error, data) {
                    //console.log(data);
                    jenkins.delete_job('crush-new', function(error, data) {
                        if(error) {
                            console.log("error!");
                        }
                        console.log(data);   
                    });
                });
*/
/*
jenkins.delete_job('crush-new', function(error, data) {
    if(error) {
        console.log("error!");
        console.log(data.body, data.statusCode);   
*/
