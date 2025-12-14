pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Build & Deploy') {
            steps {
                script {
                    sh 'docker compose up -d --build --remove-orphans'
                }
            }
        }
        
        stage('Health Check') {
            steps {
                sleep 10
                // wget --spider: Checks if the URL exists without downloading the content
                sh 'docker compose exec -T order-service wget --spider http://localhost:3001/metrics'
            }
        }
    }
}