nodejs-jenkins-api
=================

## Install

<pre>
npm install jenkins-api
</pre>

## Usage

### setup

```javascript
var jenkinsapi = require('jenkins-api');

// no auth
var jenkins = jenkinsapi.init("http://jenkins.yoursite.com");

// username/password
var jenkins = jenkinsapi.init("http://username:password@jenkins.yoursite.com");

// API Token
var jenkins = jenkinsapi.init('https://username:token@jenkins.company.com');

```

### all jobs

```javascript
jenkins.all_jobs(function(err, data) {
  if (err){ return console.log(err); }
  console.log(data)
});
```
### job info

```javascript
jenkins.job_info('job-in-jenkins', function(err, data) {
  if (err){ return console.log(err); }
  console.log(data)
});
```
### enable job

```javascript
jenkins.enable_job('job-in-jenkins', function(err, data) {
  if (err){ return console.log(err); }
  console.log(data)
});
```
### disable job

```javascript
jenkins.disable_job('job-in-jenkins', function(err, data) {
  if (err){ return console.log(err); }
  console.log(data)
});
```

### build

```javascript
jenkins.build('job-in-jenkins', function(err, data) {
  if (err){ return console.log(err); }
  console.log(data)
});
```
### stop build

```javascript
jenkins.stop_build('job-in-jenkins', 'build-number',function(err, data) {
  if (err){ return console.log(err); }
  console.log(data)
});
```


### build with params

```javascript
jenkins.build('job-in-jenkins', {key: 'value'}, function(err, data) {
  if (err){ return console.log(err); }
  console.log(data)
});
```

### build info

```javascript
jenkins.build_info('job-in-jenkins', 'build-number', function(err, data) {
  if (err){ return console.log(err); }
  console.log(data)
});
```

### last build info

```javascript
jenkins.last_build_info('job-in-jenkins', function(err, data) {
  if (err){ return console.log(err); }
  console.log(data)
});
```

### last build report

```javascript
jenkins.last_build_report('job-in-jenkins', function(err, data) {
  if (err){ return console.log(err); }
  console.log(data)
});
```

### get config xml

```javascript
jenkins.get_config_xml('job-in-jenkins', function(err, data) {
  if (err){ return console.log(err); }
  console.log(data)
});
```

### update job

```javascript
jenkins.update_job('job-to-update',
                   function(config) {
                       // function which takes the config.xml, and returns
                       // the new config xml for the job
                       return config.replace('development,'feature-branch');
                   }
                   ,function(err, data) {
                       // if no error, job was copied
                       if (err){ return console.log(err); }
                       console.log(data)
                   });
```

### copy job

```javascript
jenkins.copy_job('job-to-copy'
                ,'new-job-title'
                ,function(config) {
                    // function which takes the config.xml, and returns
                    // the new config xml for the new job
                    return config.replace('development','feature-branch');
                }
                ,function(err, data) {
                      // if no error, job was copied
                      if (err){ return console.log(err); }
                      console.log(data)
                });
```

### delete job

```javascript
jenkins.delete_job('job-in-jenkins', function(err, data) {
  if (err){ return console.log(err); }
  console.log(data)
});
```

### last success

```javascript
jenkins.last_success('job-in-jenkins', function(err, data) {
  if (err){ return console.log(err); }
  console.log(data)
});
```

### last result
```javascript
jenkins.last_result('job-in-jenkins', function(err, data) {
  if (err){ return console.log(err); }
  console.log(data)
});
```

### job output
```javascript
jenkins.job_output('job-in-jenkins', 'buildname', function(err, data) {
  if (err){ return console.log(err); }
  console.log(data)
});
```

### get all queued items
```javascript
jenkins.queue(function(err, data) {
  if (err){ return console.log(err); }
  console.log(data)
});
```

### get all jenkins computers (aka workers)
```javascript
jenkins.computers(function(err, data) {
  if (err){ return console.log(err); }
  console.log(data)
});
```

### get all jobs in view

```javascript
jenkins.all_jobs_in_view('view-in-jenkins', function(err, data) {
      if (err){ return console.log(err); }
        console.log(data)
});
```

## Default configuration

You can set the default configuration which will be use in all HTTP requests by calling init with the additional options parameter:

```javascript
// default request options
var jenkins = jenkinsapi.init("http://jenkins.yoursite.com", {strictSSL: false});
```

Since node-jenkins-api uses [request/request](https://github.com/request/request) as HTTP client, please refer to the documentation for available options.

## Notes

Modeled after the [Python Jenkins API](https://github.com/txels/autojenkins)





