nodejs-jenkins-api
=================

We needed a middleman server, and I decided to go with Node.js, but I found that there was no decent Node.js API. SO, I made one =). I was really impressed by the autojenkins python API, which it follows closely:

https://github.com/txels/autojenkins

There are many things you can do, such as:

## Install

<pre>
git clone git@github.com:jansepar/node-jenkins-api.git
cd node-jenkins-api
npm link
</pre>

## Usage

### setup

```javascript
var jenkinsapi = require('./jenkinsapi');

var jenkins = jenkinsapi.init("http://jenkins.yoursite.com");
// or with auth
var jenkins = jenkinsapi.init("http://username:password@jenkins.yoursite.com");
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

### copy job

```javascript
jenkins.copy_job('job-to-copy'
                ,'new-job-title'
                ,function(config) {
                    // function which takes the config.xml, and returns
                    // the new config xml for the new job
                    return config.replace('development','feature-branch');
                }
                ,function(error, data) {
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




