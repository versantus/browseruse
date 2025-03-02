const { execSync } = require('child_process');
const chalk = require('chalk');

// Function to check if a global package is installed
function isPackageInstalled(packageName) {
  try {
    execSync(`npm list -g ${packageName} --depth=0`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Check for required global packages
const requiredPackages = ['cross-env', 'wait-on'];
const missingPackages = [];

console.log(chalk.blue('Checking for required global packages...'));

requiredPackages.forEach(pkg => {
  if (!isPackageInstalled(pkg)) {
    missingPackages.push(pkg);
  }
});

if (missingPackages.length > 0) {
  console.log(chalk.yellow('Warning: The following required global packages are missing:'));
  missingPackages.forEach(pkg => {
    console.log(chalk.yellow(`  - ${pkg}`));
  });
  console.log(chalk.green('\nPlease install them using:'));
  console.log(chalk.green(`npm install -g ${missingPackages.join(' ')}`));
  console.log(chalk.blue('\nThen try running the application again.'));
  process.exit(1);
} else {
  console.log(chalk.green('All required global packages are installed!'));
}
