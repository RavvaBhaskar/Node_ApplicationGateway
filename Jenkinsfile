node {
    stage 'Checkout'
    /* Checkout the code we are currently running against */
    checkout scm

    stage('Install Dependencies') {
        /* Build the Docker image with a Dockerfile, tagging it with the build number */
        sh 'eval `ssh-agent -s`'
        sh 'ssh-add /opt/jenkins/.ssh/id_gitlab_rsa'
        sh 'npm install'
    }

    stage('Lint') {
    /* We can run tests inside our new image */
        app.inside {
            sh 'gulp gulp'
        }
    }

    stage('Test') {
        /* We can run tests inside our new image */
        app.inside {
            sh 'gulp test'
        }
    }

}