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
                    // In a real scenario, we might build images and push to a registry.
                    // For this test lab, we just use Compose to rebuild and restart.
                    sh 'docker compose up -d --build --remove-orphans'
                }
            }
        }
        
        stage('Health Check') {
            steps {
                sleep 10
                // Simple check to see if Order service is alive
                sh 'curl -f http://order-service:3001/metrics || exit 1'
            }
        }
    }
}