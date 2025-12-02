const { spawn } = require('child_process');
const path = require('path');
const { getYtDlpExecutable } = require('./ensureYtDlp');

/**
 * Runs yt-dlp with the given arguments.
 * @param {string[]} args - Array of arguments for yt-dlp.
 * @param {object} options - Options for spawn (optional).
 * @returns {Promise<string|object>} - Returns stdout as string or parsed JSON if -J is used.
 */
function runYtDlp(args, options = {}) {
    return new Promise((resolve, reject) => {
        const executable = getYtDlpExecutable();
        const process = spawn(executable, args, options);

        let stdout = '';
        let stderr = '';

        if (process.stdout) {
            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });
        }

        if (process.stderr) {
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });
        }

        process.on('close', (code) => {
            if (code !== 0) {
                // Construct a helpful error message with stderr
                const errorMessage = stderr.trim() || `yt-dlp exited with code ${code}`;
                const error = new Error(errorMessage);
                error.exitCode = code;
                error.stderr = stderr;
                error.command = `${executable} ${args.join(' ')}`;
                console.error(`[yt-dlp error] Exit code: ${code}`);
                console.error(`[yt-dlp error] Command: ${error.command}`);
                console.error(`[yt-dlp error] Stderr: ${stderr}`);
                return reject(error);
            }

            // If JSON output was requested, try to parse it
            if (args.includes('-J') || args.includes('-j')) {
                try {
                    const json = JSON.parse(stdout);
                    return resolve(json);
                } catch (e) {
                    return reject(new Error('Failed to parse yt-dlp JSON output'));
                }
            }

            resolve(stdout);
        });

        process.on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * Spawns yt-dlp and returns the child process directly for streaming.
 * @param {string[]} args 
 * @returns {ChildProcess}
 */
function spawnYtDlp(args) {
    const executable = getYtDlpExecutable();
    return spawn(executable, args);
}

module.exports = { runYtDlp, spawnYtDlp };
