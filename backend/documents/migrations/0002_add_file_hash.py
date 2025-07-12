# Generated manually for adding file_hash field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='document',
            name='file_hash',
            field=models.CharField(blank=True, max_length=32, null=True),
        ),
        migrations.AlterUniqueTogether(
            name='document',
            unique_together={('user', 'file_hash')},
        ),
    ] 