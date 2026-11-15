"""Build the optional analysis image from verified PyPI wheels; no account files enter the build."""
import pathlib, tempfile, subprocess, shutil
root = pathlib.Path(__file__).resolve().parent
packages = ['numpy==2.3.5', 'pandas==2.3.3', 'matplotlib==3.10.8', 'openpyxl==3.1.5', 'python-docx==1.2.0', 'python-pptx==1.0.2', 'pypdf==6.3.0', 'pillow==12.0.0']
with tempfile.TemporaryDirectory(prefix='duck-code-build-') as temp:
    context = pathlib.Path(temp)
    wheels = context / 'wheels'
    wheels.mkdir()
    subprocess.run(['python3', '-m', 'pip', 'download', '--cache-dir', '/tmp/duck-pip-cache', '--dest', str(wheels), '--only-binary=:all:', '--python-version', '313', '--implementation', 'cp', '--abi', 'cp313', '--platform', 'manylinux_2_28_x86_64', '--platform', 'manylinux2014_x86_64', *packages], check=True)
    shutil.copy(root.parent/'server/fonts/NotoSansKR.ttf', context/'NotoSansKR.ttf')
    shutil.copy(root.parent/'server/fonts/OFL.txt', context/'OFL.txt')
    (context/'Dockerfile').write_text('FROM python:3.13-slim\nCOPY wheels /wheels\nRUN pip install --no-index --find-links=/wheels '+' '.join(packages)+' && rm -rf /wheels\nCOPY NotoSansKR.ttf /usr/share/fonts/truetype/NotoSansKR.ttf\nCOPY OFL.txt /usr/share/fonts/truetype/NotoSansKR.OFL.txt\nRUN chmod a+r /usr/share/fonts/truetype/NotoSansKR*\n')
    subprocess.run(['docker','build','-t','duck-code:local',str(context)], check=True)
